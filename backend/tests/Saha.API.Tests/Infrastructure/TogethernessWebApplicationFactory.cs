using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using NSubstitute;
using Saha.Application.Common.Interfaces;
using Saha.Domain.Interfaces.Services;
using Saha.Infrastructure.Persistence;

namespace Saha.API.Tests.Infrastructure;

public class SahaWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string _dbName = Guid.NewGuid().ToString();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureServices(services =>
        {
            // Drop the production DbContext options (registered against SqlServer). Just replacing the
            // options is not enough: AddDbContext also registers the SqlServer provider's internal
            // services, and EF refuses to initialise a context when two providers share one container.
            // Isolate the InMemory provider behind its own internal service provider to sidestep that.
            var dbDescriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<ApplicationDbContext>));
            if (dbDescriptor is not null)
                services.Remove(dbDescriptor);

            var inMemoryProvider = new ServiceCollection()
                .AddEntityFrameworkInMemoryDatabase()
                .BuildServiceProvider();

            services.AddDbContext<ApplicationDbContext>(options =>
                options.UseInMemoryDatabase(_dbName)
                    .UseInternalServiceProvider(inMemoryProvider));

            var emailDescriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(IEmailService));
            if (emailDescriptor is not null)
                services.Remove(emailDescriptor);

            var emailService = Substitute.For<IEmailService>();
            emailService.SendAsync(Arg.Any<Application.Common.Interfaces.EmailMessage>(), Arg.Any<CancellationToken>())
                .Returns(Task.CompletedTask);
            emailService.SendToMultipleAsync(Arg.Any<IEnumerable<Application.Common.Interfaces.EmailMessage>>(), Arg.Any<CancellationToken>())
                .Returns(Task.CompletedTask);
            services.AddSingleton(emailService);

            var storageDescriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(IBlobStorageService));
            if (storageDescriptor is not null)
                services.Remove(storageDescriptor);

            var storageService = Substitute.For<IBlobStorageService>();
            services.AddSingleton(storageService);
        });
    }

    public ApplicationDbContext GetDbContext()
    {
        var scope = Services.CreateScope();
        return scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    }
}
