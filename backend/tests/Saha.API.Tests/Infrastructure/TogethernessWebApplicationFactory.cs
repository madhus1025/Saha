using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using NSubstitute;
using Saha.Application.Common.Interfaces;
using Saha.Domain.Interfaces.Services;
using Saha.Infrastructure.Persistence;

namespace Saha.API.Tests.Infrastructure;

public sealed class SahaWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string _dbName = Guid.NewGuid().ToString();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureServices(services =>
        {
            var dbDescriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<ApplicationDbContext>));
            if (dbDescriptor is not null)
                services.Remove(dbDescriptor);

            services.AddDbContext<ApplicationDbContext>(options =>
                options.UseInMemoryDatabase(_dbName));

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
