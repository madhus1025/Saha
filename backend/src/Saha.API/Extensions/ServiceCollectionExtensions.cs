using System.Reflection;
using System.Text;
using Asp.Versioning;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using OpenTelemetry.Exporter;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using Saha.API.Middleware;
using Saha.Application.Common.Interfaces;
using Saha.Application.Telemetry;

namespace Saha.API.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddApiServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUserContext, HttpCurrentUserContext>();

        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = configuration["Jwt:Issuer"],
                ValidateAudience = true,
                ValidAudience = configuration["Jwt:Audience"],
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(
                    Encoding.UTF8.GetBytes(configuration["Jwt:SecretKey"]
                        ?? throw new InvalidOperationException("JWT secret key is not configured."))),
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromSeconds(30)
            };

            options.Events = new JwtBearerEvents
            {
                OnAuthenticationFailed = context =>
                {
                    if (context.Exception is SecurityTokenExpiredException)
                        context.Response.Headers.Append("X-Token-Expired", "true");
                    return Task.CompletedTask;
                }
            };
        });

        services.AddAuthorization();

        // Limits are configurable so non-production environments (e.g. IntegrationTest / E2E, which
        // fire many auth calls in a burst) can relax them. Production defaults are unchanged when the
        // "RateLimiting" config section is absent.
        var authPermit = configuration.GetValue<int?>("RateLimiting:Auth:PermitLimit") ?? 5;
        var apiPermit = configuration.GetValue<int?>("RateLimiting:Api:PermitLimit") ?? 100;
        var availabilityPermit = configuration.GetValue<int?>("RateLimiting:Availability:PermitLimit") ?? 30;

        services.AddRateLimiter(options =>
        {
            options.AddFixedWindowLimiter("auth", limiter =>
            {
                limiter.PermitLimit = authPermit;
                limiter.Window = TimeSpan.FromMinutes(1);
                limiter.QueueProcessingOrder = System.Threading.RateLimiting.QueueProcessingOrder.OldestFirst;
                limiter.QueueLimit = 0;
            });

            options.AddFixedWindowLimiter("api", limiter =>
            {
                limiter.PermitLimit = apiPermit;
                limiter.Window = TimeSpan.FromMinutes(1);
                limiter.QueueProcessingOrder = System.Threading.RateLimiting.QueueProcessingOrder.OldestFirst;
                limiter.QueueLimit = 5;
            });

            // Registration availability checks are debounced but still bursty: typing a 9-character
            // TogetherID fires several. The "auth" limiter (5/min) would lock a user out of their own
            // registration. This is looser, but the response is a bare boolean.
            options.AddFixedWindowLimiter("availability", limiter =>
            {
                limiter.PermitLimit = availabilityPermit;
                limiter.Window = TimeSpan.FromMinutes(1);
                limiter.QueueProcessingOrder = System.Threading.RateLimiting.QueueProcessingOrder.OldestFirst;
                limiter.QueueLimit = 0;
            });

            // Separate limiter for the frontend telemetry ingest endpoint
            options.AddFixedWindowLimiter("telemetry", limiter =>
            {
                limiter.PermitLimit = 60; // 60 batches/min per IP (≈1/second)
                limiter.Window = TimeSpan.FromMinutes(1);
                limiter.QueueProcessingOrder = System.Threading.RateLimiting.QueueProcessingOrder.OldestFirst;
                limiter.QueueLimit = 0;
            });

            options.OnRejected = async (context, cancellationToken) =>
            {
                context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                await context.HttpContext.Response.WriteAsync(
                    "Too many requests. Please try again later.", cancellationToken);
            };
        });

        services.AddCors(options =>
        {
            options.AddPolicy("AllowFrontend", policy =>
            {
                var allowedOrigins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
                    ?? ["http://localhost:5173"];

                policy
                    .WithOrigins(allowedOrigins)
                    .AllowAnyHeader()
                    .AllowAnyMethod()
                    .AllowCredentials();
            });
        });

        services.AddApiVersioning(options =>
        {
            options.DefaultApiVersion = new ApiVersion(1, 0);
            options.AssumeDefaultVersionWhenUnspecified = true;
            options.ReportApiVersions = true;
            options.ApiVersionReader = ApiVersionReader.Combine(
                new UrlSegmentApiVersionReader(),
                new HeaderApiVersionReader("X-Api-Version"));
        })
        .AddApiExplorer(options =>
        {
            options.GroupNameFormat = "'v'VVV";
            options.SubstituteApiVersionInUrl = true;
        });

        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen(options =>
        {
            options.SwaggerDoc("v1", new OpenApiInfo
            {
                Version = "v1",
                Title = "Saha API",
                Description = "A digital home for couples — REST API v1"
            });

            options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
            {
                Type = SecuritySchemeType.Http,
                Scheme = "bearer",
                BearerFormat = "JWT",
                Description = "Enter your JWT access token."
            });

            options.AddSecurityRequirement(new OpenApiSecurityRequirement
            {
                {
                    new OpenApiSecurityScheme
                    {
                        Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
                    },
                    Array.Empty<string>()
                }
            });
        });

        // Roles arrive from the registration wizard as "Husband"/"Wife". Outbound DTOs already
        // stringify their enums by hand, so this changes no existing response shape.
        services.AddControllers()
            .AddJsonOptions(options =>
            {
                options.JsonSerializerOptions.Converters.Add(
                    new System.Text.Json.Serialization.JsonStringEnumConverter());
                // Always serialize DateTime with an explicit UTC offset (trailing "Z"). DB-sourced
                // timestamps otherwise lose their Kind and are written offset-less, which non-UTC
                // clients misread as local time. See UtcDateTimeJsonConverter.
                options.JsonSerializerOptions.Converters.Add(
                    new Saha.API.Serialization.UtcDateTimeJsonConverter());
            });

        // ── OpenTelemetry: traces → Grafana Tempo, metrics → Grafana Mimir ────
        AddOpenTelemetry(services, configuration);

        return services;
    }

    private static void AddOpenTelemetry(IServiceCollection services, IConfiguration configuration)
    {
        var otlpEndpoint = configuration["Grafana:OtlpEndpoint"];
        var otlpHeaders  = configuration["Grafana:OtlpHeaders"]; // "Authorization=Basic base64(instanceId:token)"

        // Skip OTel setup when no endpoint is configured (local dev without Grafana Cloud)
        if (string.IsNullOrWhiteSpace(otlpEndpoint)) return;

        var serviceVersion = Assembly.GetExecutingAssembly().GetName().Version?.ToString(3) ?? "1.0.0";

        services.AddOpenTelemetry()
            .ConfigureResource(resource => resource
                .AddService(
                    serviceName:        "saha-api",
                    serviceVersion:     serviceVersion,
                    serviceInstanceId:  Environment.MachineName))
            .WithTracing(tracing => tracing
                .AddAspNetCoreInstrumentation(opts =>
                {
                    opts.RecordException = true;
                    // Skip health-check noise
                    opts.Filter = ctx => !ctx.Request.Path.StartsWithSegments("/health");
                })
                .AddHttpClientInstrumentation(opts =>
                {
                    opts.RecordException = true;
                })
                .AddOtlpExporter(opts =>
                {
                    opts.Endpoint = new Uri(otlpEndpoint + "/v1/traces");
                    opts.Protocol  = OtlpExportProtocol.HttpProtobuf;
                    if (!string.IsNullOrWhiteSpace(otlpHeaders))
                        opts.Headers = otlpHeaders;
                }))
            .WithMetrics(metrics => metrics
                .AddAspNetCoreInstrumentation()
                .AddHttpClientInstrumentation()
                // Pick up the Saha.Auth meter created by AuthMetrics
                .AddMeter(AuthMetrics.MeterName)
                .AddOtlpExporter(opts =>
                {
                    opts.Endpoint = new Uri(otlpEndpoint + "/v1/metrics");
                    opts.Protocol  = OtlpExportProtocol.HttpProtobuf;
                    if (!string.IsNullOrWhiteSpace(otlpHeaders))
                        opts.Headers = otlpHeaders;
                }));
    }
}
