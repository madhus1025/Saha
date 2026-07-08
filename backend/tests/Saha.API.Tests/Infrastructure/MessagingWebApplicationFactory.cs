using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Saha.API.Tests.Infrastructure;

/// <summary>
/// Messaging integration tests register several couples per test (each register + login hits the
/// strict 5/min "auth" limiter). This factory swaps the rate limiters for permissive ones so the
/// limiter never masks a functional assertion. Behaviour is otherwise identical to
/// <see cref="SahaWebApplicationFactory"/>.
/// </summary>
public sealed class MessagingWebApplicationFactory : SahaWebApplicationFactory
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        base.ConfigureWebHost(builder);

        builder.ConfigureServices(services =>
        {
            var limiterConfigurators = services
                .Where(d => d.ServiceType == typeof(IConfigureOptions<RateLimiterOptions>))
                .ToList();
            foreach (var descriptor in limiterConfigurators)
                services.Remove(descriptor);

            services.Configure<RateLimiterOptions>(options =>
            {
                foreach (var policy in new[] { "auth", "api", "telemetry" })
                    options.AddFixedWindowLimiter(policy, limiter =>
                    {
                        limiter.PermitLimit = 1_000_000;
                        limiter.Window = TimeSpan.FromMinutes(1);
                        limiter.QueueLimit = 0;
                    });
            });
        });
    }
}
