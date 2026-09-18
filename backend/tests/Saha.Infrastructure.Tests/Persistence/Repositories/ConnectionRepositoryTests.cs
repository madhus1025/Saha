using FluentAssertions;
using MediatR;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using NSubstitute;
using Saha.Application.Common.Exceptions;
using Saha.Domain.Entities;
using Saha.Infrastructure.Persistence;
using Saha.Infrastructure.Persistence.Interceptors;
using Saha.Infrastructure.Persistence.Repositories;
using Xunit;

namespace Saha.Infrastructure.Tests.Persistence.Repositories;

public sealed class ConnectionRepositoryTests : IDisposable
{
    private readonly string _databasePath = Path.Combine(
        Path.GetTempPath(),
        $"saha-connection-concurrency-{Guid.NewGuid():N}.db");

    [Fact]
    public async Task UpdateAsync_WhenTwoTerminalTransitionsRace_OnlyFirstWriteCommits()
    {
        var coupleAId = Guid.NewGuid();
        var coupleBId = Guid.NewGuid();
        var connection = CoupleConnection.CreateRequest(
            coupleAId,
            coupleBId,
            "ALPHA-BETA",
            "GAMMA-DELTA");

        await using (var setup = CreateContext())
        {
            await setup.Database.EnsureCreatedAsync();
            await new ConnectionRepository(setup).AddAsync(connection);
        }

        await using var acceptingContext = CreateContext();
        await using var rejectingContext = CreateContext();
        var acceptingRepository = new ConnectionRepository(acceptingContext);
        var rejectingRepository = new ConnectionRepository(rejectingContext);

        var acceptingCopy = await acceptingRepository.GetByIdAsync(connection.Id);
        var rejectingCopy = await rejectingRepository.GetByIdAsync(connection.Id);

        acceptingCopy!.Accept("ALPHA-BETA", "GAMMA-DELTA");
        rejectingCopy!.Reject();

        await acceptingRepository.UpdateAsync(acceptingCopy);
        var losingWrite = () => rejectingRepository.UpdateAsync(rejectingCopy);

        var error = await losingWrite.Should().ThrowAsync<ConflictException>();
        error.Which.ConflictCode.Should().Be("CONNECTION_ALREADY_RESOLVED");

        await using var verificationContext = CreateContext();
        var persisted = await verificationContext.CoupleConnections.SingleAsync(c => c.Id == connection.Id);
        persisted.IsAccepted.Should().BeTrue();
    }

    private ApplicationDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlite(new SqliteConnectionStringBuilder { DataSource = _databasePath }.ToString())
            .Options;
        var mediator = Substitute.For<IMediator>();
        return new ApplicationDbContext(
            options,
            mediator,
            new AuditableEntityInterceptor(),
            new DomainEventDispatchInterceptor(mediator));
    }

    public void Dispose()
    {
        if (File.Exists(_databasePath)) File.Delete(_databasePath);
    }
}
