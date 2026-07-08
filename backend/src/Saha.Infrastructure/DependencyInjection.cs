using Azure.Storage.Blobs;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Saha.Application.Common.Interfaces;
using Saha.Domain.Interfaces.Repositories;
using Saha.Domain.Interfaces.Services;
using Saha.Infrastructure.Persistence;
using Saha.Infrastructure.Persistence.Interceptors;
using Saha.Infrastructure.Persistence.Repositories;
using Saha.Infrastructure.Services;
using Saha.Infrastructure.Services.Auth;
using Saha.Infrastructure.Services.Email;
using Saha.Infrastructure.Services.Storage;

namespace Saha.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection") ?? "";
        var isSqlite = connectionString.StartsWith("Data Source=", StringComparison.OrdinalIgnoreCase);

        services.AddDbContext<ApplicationDbContext>(options =>
        {
            if (isSqlite)
                options.UseSqlite(connectionString);
            else
                options.UseSqlServer(connectionString, sqlOptions =>
                {
                    sqlOptions.EnableRetryOnFailure(
                        maxRetryCount: 5,
                        maxRetryDelay: TimeSpan.FromSeconds(30),
                        errorNumbersToAdd: null);
                    sqlOptions.CommandTimeout(30);
                });
        });

        services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<ApplicationDbContext>());
        services.AddScoped<AuditableEntityInterceptor>();
        services.AddScoped<DomainEventDispatchInterceptor>();

        services.AddScoped<ICoupleRepository, CoupleRepository>();
        services.AddScoped<IConnectionRepository, ConnectionRepository>();
        services.AddScoped<IAuditLogRepository, AuditLogRepository>();
        services.AddScoped<IConversationRepository, ConversationRepository>();
        services.AddScoped<IMessageRepository, MessageRepository>();

        services.AddScoped<IPasswordHasher, BcryptPasswordHasher>();
        services.AddScoped<ITokenService, JwtTokenService>();
        services.AddScoped<IAuditLogger, AuditLoggerService>();
        services.AddSingleton<IDateTimeProvider, DateTimeProvider>();

        // Email: use real SMTP when configured, null (console log) otherwise
        var smtpHost = configuration["Smtp:Host"];
        if (!string.IsNullOrWhiteSpace(smtpHost))
        {
            services.Configure<SmtpSettings>(configuration.GetSection("Smtp"));
            services.AddScoped<IEmailService, SmtpEmailService>();
        }
        else
        {
            services.AddScoped<IEmailService, NullEmailService>();
        }

        // Blob storage: use Azure when configured with a real connection string
        var blobConnectionString = configuration["AzureStorage:ConnectionString"];
        var isRealBlobStorage = !string.IsNullOrWhiteSpace(blobConnectionString)
            && !blobConnectionString.StartsWith("REPLACE_", StringComparison.OrdinalIgnoreCase)
            && !blobConnectionString.Equals("UseDevelopmentStorage=true", StringComparison.OrdinalIgnoreCase);
        if (isRealBlobStorage)
        {
            services.AddSingleton(new BlobServiceClient(blobConnectionString));
            services.AddScoped<IBlobStorageService, AzureBlobStorageService>();
        }
        else
        {
            services.AddScoped<IBlobStorageService, NullBlobStorageService>();
        }

        return services;
    }
}
