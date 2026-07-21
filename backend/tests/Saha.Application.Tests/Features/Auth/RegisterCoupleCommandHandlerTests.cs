using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using NSubstitute;
using NSubstitute.ExceptionExtensions;
using Saha.Application.Common.Exceptions;
using Saha.Application.Common.Interfaces;
using Saha.Application.Features.Auth.Commands.Register;
using Saha.Application.Telemetry;
using Saha.Domain.Entities;
using Saha.Domain.Enums;
using Saha.Domain.Interfaces.Repositories;
using Saha.Domain.Interfaces.Services;
using Xunit;

namespace Saha.Application.Tests.Features.Auth;

public sealed class RegisterCoupleCommandHandlerTests
{
    private readonly ICoupleRepository _coupleRepository = Substitute.For<ICoupleRepository>();
    private readonly IPasswordHasher _passwordHasher = Substitute.For<IPasswordHasher>();
    private readonly IAuthTokenIssuer _tokenIssuer = Substitute.For<IAuthTokenIssuer>();
    private readonly IAuditLogger _auditLogger = Substitute.For<IAuditLogger>();
    private readonly ICurrentUserContext _currentUser = Substitute.For<ICurrentUserContext>();
    private readonly RegisterCoupleCommandHandler _handler;

    public RegisterCoupleCommandHandlerTests()
    {
        _passwordHasher.Hash(Arg.Any<string>()).Returns("hashed");
        _tokenIssuer
            .IssueFor(Arg.Any<Couple>(), Arg.Any<Partner>(), Arg.Any<string?>())
            .Returns(new IssuedTokens("access", "refresh",
                DateTime.UtcNow.AddMinutes(15), DateTime.UtcNow.AddDays(30)));

        _handler = new RegisterCoupleCommandHandler(
            _coupleRepository, _passwordHasher, _tokenIssuer, _auditLogger, _currentUser, new AuthMetrics());
    }

    private static RegisterCoupleCommand Command(
        string togetherId = "MADHU-PRIYA",
        string username = "madhu",
        PartnerRole role = PartnerRole.Husband) => new(
            TogetherID: togetherId,
            Username: username,
            Name: "Madhu Kumar",
            DateOfBirth: new DateTime(1990, 5, 15),
            Email: "madhu@example.com",
            PhoneNumber: "+911234567890",
            Role: role,
            Password: "Our quiet home by the sea 1!",
            ConfirmPassword: "Our quiet home by the sea 1!");

    [Fact]
    public async Task Handle_CreatesCoupleWithOneRegistrant_AwaitingPartner()
    {
        Couple? saved = null;
        await _coupleRepository.AddAsync(Arg.Do<Couple>(c => saved = c), Arg.Any<CancellationToken>());

        var result = await _handler.Handle(Command(), CancellationToken.None);

        saved.Should().NotBeNull();
        saved!.Partners.Should().HaveCount(1);
        saved.State.Should().Be(CoupleState.AwaitingPartner);
        saved.Husband.Should().NotBeNull();
        saved.Wife.Should().BeNull();

        result.CoupleState.Should().Be(nameof(CoupleState.AwaitingPartner));
    }

    [Fact]
    public async Task Handle_RegisteringAsWife_LeavesHusbandUnset()
    {
        Couple? saved = null;
        await _coupleRepository.AddAsync(Arg.Do<Couple>(c => saved = c), Arg.Any<CancellationToken>());

        await _handler.Handle(Command(username: "priya", role: PartnerRole.Wife), CancellationToken.None);

        saved!.Wife.Should().NotBeNull();
        saved.Husband.Should().BeNull();
    }

    [Fact]
    public async Task Handle_IssuesTokens_SoTheRegistrantIsSignedIn()
    {
        var result = await _handler.Handle(Command(), CancellationToken.None);

        result.AccessToken.Should().Be("access");
        result.RefreshToken.Should().Be("refresh");
        result.PartnerId.Should().NotBeEmpty();

        _tokenIssuer.Received(1).IssueFor(Arg.Any<Couple>(), Arg.Any<Partner>(), Arg.Any<string?>());
    }

    [Fact]
    public async Task Handle_NormalizesTogetherIdAndUsername()
    {
        Couple? saved = null;
        await _coupleRepository.AddAsync(Arg.Do<Couple>(c => saved = c), Arg.Any<CancellationToken>());

        await _handler.Handle(Command(togetherId: " madhu-priya ", username: " MADHU "), CancellationToken.None);

        saved!.TogetherID.Should().Be("MADHU-PRIYA");
        saved.Partners[0].Username.Should().Be("madhu");
    }

    [Fact]
    public async Task Handle_HashesThePassword_AndNeverStoresPlainText()
    {
        Couple? saved = null;
        await _coupleRepository.AddAsync(Arg.Do<Couple>(c => saved = c), Arg.Any<CancellationToken>());

        await _handler.Handle(Command(), CancellationToken.None);

        saved!.PasswordHash.Should().Be("hashed");
        _passwordHasher.Received(1).Hash("Our quiet home by the sea 1!");
    }

    [Fact]
    public async Task Handle_WithTakenTogetherId_ThrowsConflict()
    {
        _coupleRepository.ExistsByTogetherIDAsync("MADHU-PRIYA", Arg.Any<CancellationToken>()).Returns(true);

        var act = () => _handler.Handle(Command(), CancellationToken.None);

        (await act.Should().ThrowAsync<ConflictException>())
            .Which.ConflictCode.Should().Be("TOGETHER_ID_TAKEN");
    }

    [Fact]
    public async Task Handle_WithTakenUsername_ThrowsConflict()
    {
        _coupleRepository.ExistsByUsernameAsync("madhu", Arg.Any<CancellationToken>()).Returns(true);

        var act = () => _handler.Handle(Command(), CancellationToken.None);

        (await act.Should().ThrowAsync<ConflictException>())
            .Which.ConflictCode.Should().Be("USERNAME_TAKEN");
    }

    [Fact]
    public async Task Handle_WhenTogetherIdIsClaimedBetweenCheckAndInsert_ThrowsConflictNotServerError()
    {
        // The availability pre-check passes, then the unique index rejects the insert (TDD-FR-4).
        _coupleRepository
            .AddAsync(Arg.Any<Couple>(), Arg.Any<CancellationToken>())
            .ThrowsAsync(new DbUpdateException(
                "insert failed",
                new Exception("UNIQUE constraint failed: Couples.TogetherID")));

        var act = () => _handler.Handle(Command(), CancellationToken.None);

        (await act.Should().ThrowAsync<ConflictException>())
            .Which.ConflictCode.Should().Be("TOGETHER_ID_TAKEN");
    }

    [Fact]
    public async Task Handle_DoesNotSwallowUnrelatedPersistenceFailures()
    {
        _coupleRepository
            .AddAsync(Arg.Any<Couple>(), Arg.Any<CancellationToken>())
            .ThrowsAsync(new DbUpdateException("disk full", new Exception("no space left on device")));

        var act = () => _handler.Handle(Command(), CancellationToken.None);

        await act.Should().ThrowAsync<DbUpdateException>();
    }

    [Fact]
    public async Task Handle_AuditsTheRegistration()
    {
        await _handler.Handle(Command(), CancellationToken.None);

        await _auditLogger.Received(1).LogAsync(
            action: "COUPLE_REGISTERED",
            isSuccess: true,
            coupleId: Arg.Any<Guid?>(),
            partnerId: Arg.Any<Guid?>(),
            resourceType: Arg.Any<string?>(),
            resourceId: Arg.Any<Guid?>(),
            details: Arg.Any<string?>(),
            ipAddress: Arg.Any<string?>(),
            userAgent: Arg.Any<string?>(),
            errorCode: Arg.Any<string?>(),
            cancellationToken: Arg.Any<CancellationToken>());
    }
}
