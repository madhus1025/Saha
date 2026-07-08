using FluentAssertions;
using NSubstitute;
using Saha.Application.Common.Exceptions;
using Saha.Application.Common.Interfaces;
using Saha.Application.Features.Auth.Commands.Register;
using Saha.Domain.Interfaces.Repositories;
using Saha.Domain.Interfaces.Services;
using Xunit;

namespace Saha.Application.Tests.Features.Auth;

public sealed class RegisterCoupleCommandHandlerTests
{
    private readonly ICoupleRepository _coupleRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IAuditLogger _auditLogger;
    private readonly ICurrentUserContext _currentUser;
    private readonly RegisterCoupleCommandHandler _handler;

    public RegisterCoupleCommandHandlerTests()
    {
        _coupleRepository = Substitute.For<ICoupleRepository>();
        _passwordHasher = Substitute.For<IPasswordHasher>();
        _auditLogger = Substitute.For<IAuditLogger>();
        _currentUser = Substitute.For<ICurrentUserContext>();

        _passwordHasher.Hash(Arg.Any<string>()).Returns("hashed_password");
        _currentUser.IpAddress.Returns("127.0.0.1");
        _currentUser.UserAgent.Returns("test-agent");

        _handler = new RegisterCoupleCommandHandler(
            _coupleRepository, _passwordHasher, _auditLogger, _currentUser, new Saha.Application.Telemetry.AuthMetrics());
    }

    private static RegisterCoupleCommand ValidCommand() => new(
        TogetherID: "MADHU-PRIYA",
        HusbandUsername: "madhu",
        HusbandName: "Madhu Kumar",
        HusbandDateOfBirth: new DateTime(1990, 5, 15),
        HusbandEmail: "madhu@example.com",
        HusbandPhoneNumber: "+911234567890",
        WifeUsername: "priya",
        WifeName: "Priya Kumar",
        WifeDateOfBirth: new DateTime(1992, 8, 20),
        WifeEmail: "priya@example.com",
        WifePhoneNumber: "+919876543210",
        Password: "StrongP@ss1",
        ConfirmPassword: "StrongP@ss1");

    [Fact]
    public async Task Handle_WithValidCommand_RegistersCouple()
    {
        _coupleRepository.ExistsByTogetherIDAsync(Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(false);
        _coupleRepository.ExistsByUsernameAsync(Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(false);

        var result = await _handler.Handle(ValidCommand(), CancellationToken.None);

        result.Should().NotBeNull();
        result.TogetherID.Should().Be("MADHU-PRIYA");
        result.CoupleId.Should().NotBeEmpty();

        await _coupleRepository.Received(1).AddAsync(
            Arg.Is<Domain.Entities.Couple>(c => c.TogetherID == "MADHU-PRIYA"),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithExistingTogetherID_ThrowsConflictException()
    {
        _coupleRepository.ExistsByTogetherIDAsync("MADHU-PRIYA", Arg.Any<CancellationToken>())
            .Returns(true);

        var act = async () => await _handler.Handle(ValidCommand(), CancellationToken.None);

        await act.Should().ThrowAsync<ConflictException>()
            .WithMessage("*Together ID*taken*");
    }

    [Fact]
    public async Task Handle_WithExistingHusbandUsername_ThrowsConflictException()
    {
        _coupleRepository.ExistsByTogetherIDAsync(Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(false);
        _coupleRepository.ExistsByUsernameAsync("madhu", Arg.Any<CancellationToken>())
            .Returns(true);

        var act = async () => await _handler.Handle(ValidCommand(), CancellationToken.None);

        await act.Should().ThrowAsync<ConflictException>()
            .WithMessage("*'madhu'*taken*");
    }

    [Fact]
    public async Task Handle_HashesPasswordBeforeSaving()
    {
        _coupleRepository.ExistsByTogetherIDAsync(Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(false);
        _coupleRepository.ExistsByUsernameAsync(Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(false);

        await _handler.Handle(ValidCommand(), CancellationToken.None);

        _passwordHasher.Received(1).Hash("StrongP@ss1");
    }

    [Fact]
    public async Task Handle_LogsAuditOnSuccess()
    {
        _coupleRepository.ExistsByTogetherIDAsync(Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(false);
        _coupleRepository.ExistsByUsernameAsync(Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(false);

        await _handler.Handle(ValidCommand(), CancellationToken.None);

        // Arguments must be listed in the method's declaration order so NSubstitute's positional
        // matcher queue aligns (mixing concrete values + matchers out of order throws).
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
