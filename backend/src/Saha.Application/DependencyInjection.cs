using FluentValidation;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using Saha.Application.Common.Behaviors;
using Saha.Application.Telemetry;

namespace Saha.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddMediatR(cfg =>
        {
            cfg.RegisterServicesFromAssembly(typeof(DependencyInjection).Assembly);
        });

        services.AddValidatorsFromAssembly(typeof(DependencyInjection).Assembly);

        services.AddTransient(typeof(IPipelineBehavior<,>), typeof(LoggingBehavior<,>));
        services.AddTransient(typeof(IPipelineBehavior<,>), typeof(PerformanceBehavior<,>));
        services.AddTransient(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));

        // Telemetry: singleton so the Meter instance lives for the application lifetime
        services.AddSingleton<AuthMetrics>();

        return services;
    }
}
