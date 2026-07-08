using MediatR;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using NSubstitute;
using Saha.Infrastructure.Persistence;
using Saha.Infrastructure.Persistence.Interceptors;

namespace Saha.Infrastructure.Tests.Persistence;

/// <summary>
/// Builds an <see cref="ApplicationDbContext"/> backed by an isolated in-memory SQLite database.
/// Unlike the EF InMemory provider, SQLite is relational and honours unique/filtered indexes, so
/// couple-isolation and one-per-person constraints (FR-1, FR-21) can be verified for real.
/// The <see cref="SqliteConnection"/> must stay open for the lifetime of the context.
/// </summary>
internal sealed class MessagingDbContextFactory : IDisposable
{
    private readonly SqliteConnection _connection;

    public ApplicationDbContext Context { get; }

    public MessagingDbContextFactory()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlite(_connection)
            .Options;

        var mediator = Substitute.For<IMediator>();
        Context = new ApplicationDbContext(
            options,
            mediator,
            new AuditableEntityInterceptor(),
            new DomainEventDispatchInterceptor(mediator));

        Context.Database.EnsureCreated();
    }

    public void Dispose()
    {
        Context.Dispose();
        _connection.Dispose();
    }
}
