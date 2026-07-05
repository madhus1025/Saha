using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Serilog;
using Saha.API.Extensions;
using Saha.API.Middleware;
using Saha.Application;
using Saha.Infrastructure;
using Saha.Infrastructure.Persistence;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    builder.Host.UseSerilog((context, services, config) =>
    {
        config
            .ReadFrom.Configuration(context.Configuration)
            .ReadFrom.Services(services)
            .WriteTo.Console()
            .Enrich.FromLogContext()
            .Enrich.WithMachineName()
            .Enrich.WithEnvironmentName();

        if (!string.IsNullOrWhiteSpace(context.Configuration["ApplicationInsights:ConnectionString"]))
        {
            config.WriteTo.ApplicationInsights(
                context.Configuration["ApplicationInsights:ConnectionString"],
                TelemetryConverter.Traces);
        }
    });

    builder.Services.AddApplicationServices();
    builder.Services.AddInfrastructureServices(builder.Configuration);
    builder.Services.AddApiServices(builder.Configuration);

    var app = builder.Build();

    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI(options =>
        {
            options.SwaggerEndpoint("/swagger/v1/swagger.json", "Saha API v1");
        });
    }

    app.UseMiddleware<ExceptionHandlingMiddleware>();

    app.UseHttpsRedirection();

    // Serve locally-uploaded files in dev (NullBlobStorageService saves here)
    if (app.Environment.IsDevelopment() || app.Environment.IsEnvironment("IntegrationTest"))
    {
        var uploadsPath = Path.Combine(app.Environment.ContentRootPath, "uploads");
        Directory.CreateDirectory(uploadsPath);
        app.UseStaticFiles(new StaticFileOptions
        {
            FileProvider = new PhysicalFileProvider(uploadsPath),
            RequestPath = "/uploads",
        });
    }

    app.UseSecurityHeaders();

    app.UseCors("AllowFrontend");

    app.UseRateLimiter();

    app.UseAuthentication();
    app.UseAuthorization();

    app.UseMiddleware<CurrentUserContextMiddleware>();

    app.MapControllers().RequireRateLimiting("api");

    app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }))
        .AllowAnonymous();

    // Apply database schema on startup in development and integration test environments
    if (app.Environment.IsDevelopment() || app.Environment.IsEnvironment("IntegrationTest"))
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var connStr = db.Database.GetConnectionString() ?? "";
        if (connStr.StartsWith("Data Source=", StringComparison.OrdinalIgnoreCase))
            await db.Database.EnsureCreatedAsync(); // SQLite: create schema from model
        else
            await db.Database.MigrateAsync();       // SQL Server: run migrations
    }

    await app.RunAsync();
}
catch (Exception ex) when (ex is not HostAbortedException)
{
    Log.Fatal(ex, "Application terminated unexpectedly.");
}
finally
{
    Log.CloseAndFlush();
}

// Required for integration test WebApplicationFactory
public partial class Program { }
