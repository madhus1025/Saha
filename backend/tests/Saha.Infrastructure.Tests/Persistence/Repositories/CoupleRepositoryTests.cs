using FluentAssertions;
using MediatR;
using Microsoft.EntityFrameworkCore;
using NSubstitute;
using Saha.Domain.Entities;
using Saha.Domain.Enums;
using Saha.Domain.ValueObjects;
using Saha.Infrastructure.Persistence;
using Saha.Infrastructure.Persistence.Interceptors;
using Saha.Infrastructure.Persistence.Repositories;
using Xunit;

namespace Saha.Infrastructure.Tests.Persistence.Repositories;

public sealed class CoupleRepositoryTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly CoupleRepository _repository;

    public CoupleRepositoryTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        var mediator = Substitute.For<IMediator>();
        _context = new ApplicationDbContext(
            options, mediator, new AuditableEntityInterceptor(), new DomainEventDispatchInterceptor(mediator));
        _repository = new CoupleRepository(_context);
    }

    [Fact]
    public async Task AddAsync_ShouldPersistCouple()
    {
        var couple = CreateTestCouple("ALPHA-BETA");

        await _repository.AddAsync(couple);
        await _context.SaveChangesAsync();

        var found = await _context.Couples.FindAsync(couple.Id);
        found.Should().NotBeNull();
        found!.TogetherID.Should().Be("ALPHA-BETA");
    }

    [Fact]
    public async Task GetByIdAsync_ShouldReturnCouple_WhenExists()
    {
        var couple = CreateTestCouple("CHARLIE-DELTA");
        await _repository.AddAsync(couple);
        await _context.SaveChangesAsync();

        var result = await _repository.GetByIdAsync(couple.Id);

        result.Should().NotBeNull();
        result!.Id.Should().Be(couple.Id);
    }

    [Fact]
    public async Task GetByIdAsync_ShouldReturnNull_WhenNotExists()
    {
        var result = await _repository.GetByIdAsync(Guid.NewGuid());

        result.Should().BeNull();
    }

    [Fact]
    public async Task GetByTogetherIDAsync_ShouldReturnCouple_WhenExists()
    {
        var couple = CreateTestCouple("ECHO-FOXTROT");
        await _repository.AddAsync(couple);
        await _context.SaveChangesAsync();

        var result = await _repository.GetByTogetherIDAsync(TogetherID.Create("ECHO-FOXTROT"));

        result.Should().NotBeNull();
        result!.TogetherID.Should().Be("ECHO-FOXTROT");
    }

    [Fact]
    public async Task GetByUsernameAsync_ShouldReturnCouple_WhenHusbandMatches()
    {
        var couple = CreateTestCouple("GOLF-HOTEL");
        await _repository.AddAsync(couple);
        await _context.SaveChangesAsync();

        var result = await _repository.GetByUsernameAsync(Username.Create("husbanduser"));

        result.Should().NotBeNull();
        result!.Husband.Username.Should().Be("husbanduser");
    }

    [Fact]
    public async Task GetByUsernameAsync_ShouldReturnCouple_WhenWifeMatches()
    {
        var couple = CreateTestCouple("INDIA-JULIET");
        await _repository.AddAsync(couple);
        await _context.SaveChangesAsync();

        var result = await _repository.GetByUsernameAsync(Username.Create("wifeuser"));

        result.Should().NotBeNull();
        result!.Wife.Username.Should().Be("wifeuser");
    }

    [Fact]
    public async Task ExistsByTogetherIDAsync_ShouldReturnTrue_WhenExists()
    {
        var couple = CreateTestCouple("KILO-LIMA");
        await _repository.AddAsync(couple);
        await _context.SaveChangesAsync();

        var exists = await _repository.ExistsByTogetherIDAsync(TogetherID.Create("KILO-LIMA"));

        exists.Should().BeTrue();
    }

    [Fact]
    public async Task ExistsByTogetherIDAsync_ShouldReturnFalse_WhenNotExists()
    {
        var exists = await _repository.ExistsByTogetherIDAsync(TogetherID.Create("MIKE-NOVEMBER"));

        exists.Should().BeFalse();
    }

    [Fact]
    public async Task ExistsByUsernameAsync_ShouldReturnTrue_WhenExists()
    {
        var couple = CreateTestCouple("OSCAR-PAPA");
        await _repository.AddAsync(couple);
        await _context.SaveChangesAsync();

        var exists = await _repository.ExistsByUsernameAsync(Username.Create("husbanduser"));

        exists.Should().BeTrue();
    }

    [Fact]
    public async Task UpdateAsync_ShouldPersistChanges()
    {
        var couple = CreateTestCouple("QUEBEC-ROMEO");
        await _repository.AddAsync(couple);
        await _context.SaveChangesAsync();

        couple.ChangePassword("newhashvalue");
        await _repository.UpdateAsync(couple);
        await _context.SaveChangesAsync();

        var updated = await _repository.GetByIdAsync(couple.Id);
        updated!.PasswordHash.Should().Be("newhashvalue");
    }

    [Fact]
    public async Task SearchByTogetherIDAsync_ShouldReturnMatchingCouples()
    {
        var couple1 = CreateTestCouple("SIERRA-TANGO");
        var couple2 = CreateTestCouple("SIERRA-UNIFORM");
        var couple3 = CreateTestCouple("VICTOR-WHISKEY");
        await _repository.AddAsync(couple1);
        await _repository.AddAsync(couple2);
        await _repository.AddAsync(couple3);
        await _context.SaveChangesAsync();

        var results = await _repository.SearchByTogetherIDAsync("SIERRA", 10);

        results.Should().HaveCount(2);
        results.Should().AllSatisfy(c => c.TogetherID.Should().StartWith("SIERRA"));
    }

    [Fact]
    public async Task GetByRefreshTokenHashAsync_ShouldReturnCouple_WhenActiveTokenExists()
    {
        var couple = CreateTestCouple("XRAY-YANKEE");
        var tokenHash = "testhash123456789012345678901234567890123456789012345678901234";
        couple.AddRefreshToken(RefreshToken.Create(
            couple.Id, couple.Husband.Id, tokenHash, DateTime.UtcNow.AddDays(30), "127.0.0.1"));
        await _repository.AddAsync(couple);
        await _context.SaveChangesAsync();

        var result = await _repository.GetByRefreshTokenHashAsync(tokenHash);

        result.Should().NotBeNull();
        result!.Id.Should().Be(couple.Id);
    }

    [Fact]
    public async Task GetByUsernameWithTokensAsync_ShouldReturnNull_WhenNotExists()
    {
        var result = await _repository.GetByUsernameWithTokensAsync("nonexistentuser");

        result.Should().BeNull();
    }

    /// <summary>A Complete couple — registered, then joined by its partner.</summary>
    private static Couple CreateTestCouple(
        string togetherId,
        string husbandUsername = "husbanduser",
        string wifeUsername = "wifeuser")
    {
        var couple = Couple.Register(
            togetherId: TogetherID.Create(togetherId),
            username: Username.Create(husbandUsername),
            name: "Test Husband",
            dateOfBirth: new DateTime(1990, 1, 1),
            email: EmailAddress.Create($"husband-{togetherId.ToLower()}@test.com"),
            phoneNumber: PhoneNumber.Create("+11234567890"),
            role: PartnerRole.Husband,
            passwordHash: "hashedpassword");

        couple.AcceptPartner(
            username: Username.Create(wifeUsername),
            name: "Test Wife",
            dateOfBirth: new DateTime(1992, 6, 15),
            email: EmailAddress.Create($"wife-{togetherId.ToLower()}@test.com"),
            phoneNumber: PhoneNumber.Create("+19876543210"));

        return couple;
    }

    /// <summary>A couple that has registered but whose partner has not yet accepted.</summary>
    private static Couple CreateAwaitingPartnerCouple(string togetherId, string username)
    {
        return Couple.Register(
            togetherId: TogetherID.Create(togetherId),
            username: Username.Create(username),
            name: "Solo Registrant",
            dateOfBirth: new DateTime(1990, 1, 1),
            email: EmailAddress.Create($"solo-{togetherId.ToLower()}@test.com"),
            phoneNumber: PhoneNumber.Create("+11234567890"),
            role: PartnerRole.Husband,
            passwordHash: "hashedpassword");
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}
