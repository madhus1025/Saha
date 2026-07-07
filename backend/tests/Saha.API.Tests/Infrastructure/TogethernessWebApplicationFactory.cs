using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
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
            // AddDbContext registers the SqlServer provider both as DbContextOptions<T> and as a
            // separate IDbContextOptionsConfiguration<T> descriptor; removing only the former still
            // leaves the SqlServer provider registered alongside InMemory, which EF Core rejects.
            var dbDescriptors = services.Where(
                d => d.ServiceType == typeof(DbContextOptions<ApplicationDbContext>) ||
                     d.ServiceType == typeof(IDbContextOptionsConfiguration<ApplicationDbContext>))
                .ToList();
            foreach (var descriptor in dbDescriptors)
                services.Remove(descriptor);

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
