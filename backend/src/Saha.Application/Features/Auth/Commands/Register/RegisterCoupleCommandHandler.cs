using System.Diagnostics;
using MediatR;
using Saha.Application.Common.Exceptions;
using Saha.Application.Common.Interfaces;
using Saha.Application.Telemetry;
using Saha.Domain.Entities;
using Saha.Domain.Interfaces.Repositories;
using Saha.Domain.Interfaces.Services;

namespace Saha.Application.Features.Auth.Commands.Register;

public sealed class RegisterCoupleCommandHandler : IRequestHandler<RegisterCoupleCommand, RegisterCoupleResult>
{
    private readonly ICoupleRepository _coupleRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IAuditLogger _auditLogger;
    private readonly ICurrentUserContext _currentUser;
    private readonly AuthMetrics _authMetrics;

    public RegisterCoupleCommandHandler(
        ICoupleRepository coupleRepository,
        IPasswordHasher passwordHasher,
        IAuditLogger auditLogger,
        ICurrentUserContext currentUser,
        AuthMetrics authMetrics)
    {
        _coupleRepository = coupleRepository;
        _passwordHasher = passwordHasher;
        _auditLogger = auditLogger;
        _currentUser = currentUser;
        _authMetrics = authMetrics;
    }

    public async Task<RegisterCoupleResult> Handle(
        RegisterCoupleCommand request,
        CancellationToken cancellationToken)
    {
        var sw = Stopwatch.StartNew();
        _authMetrics.RecordRegisterAttempt();

        var normalizedTogetherId = request.TogetherID.Trim().ToUpperInvariant();

        if (await _coupleRepository.ExistsByTogetherIDAsync(normalizedTogetherId, cancellationToken))
        {
            sw.Stop();
            _authMetrics.RecordRegisterFailure("TOGETHER_ID_TAKEN", sw.Elapsed.TotalMilliseconds);
            throw new ConflictException("TOGETHER_ID_TAKEN", $"Together ID '{normalizedTogetherId}' is already taken.");
        }

        if (await _coupleRepository.ExistsByUsernameAsync(request.HusbandUsername.ToLowerInvariant(), cancellationToken))
        {
            sw.Stop();
            _authMetrics.RecordRegisterFailure("HUSBAND_USERNAME_TAKEN", sw.Elapsed.TotalMilliseconds);
            throw new ConflictException("HUSBAND_USERNAME_TAKEN", $"Username '{request.HusbandUsername}' is already taken.");
        }

        if (await _coupleRepository.ExistsByUsernameAsync(request.WifeUsername.ToLowerInvariant(), cancellationToken))
        {
            sw.Stop();
            _authMetrics.RecordRegisterFailure("WIFE_USERNAME_TAKEN", sw.Elapsed.TotalMilliseconds);
            throw new ConflictException("WIFE_USERNAME_TAKEN", $"Username '{request.WifeUsername}' is already taken.");
        }

        var passwordHash = _passwordHasher.Hash(request.Password);

        var couple = Couple.Register(
            normalizedTogetherId,
            request.HusbandUsername,
            request.HusbandName,
            request.HusbandDateOfBirth,
            request.HusbandEmail,
            request.HusbandPhoneNumber,
            request.WifeUsername,
            request.WifeName,
            request.WifeDateOfBirth,
            request.WifeEmail,
            request.WifePhoneNumber,
            passwordHash);

        await _coupleRepository.AddAsync(couple, cancellationToken);

        sw.Stop();
        _authMetrics.RecordRegisterSuccess(sw.Elapsed.TotalMilliseconds);

        await _auditLogger.LogAsync(
            action: "COUPLE_REGISTERED",
            isSuccess: true,
            coupleId: couple.Id,
            details: $"Together ID: {normalizedTogetherId}",
            ipAddress: _currentUser.IpAddress,
            userAgent: _currentUser.UserAgent,
            cancellationToken: cancellationToken);

        return new RegisterCoupleResult(couple.Id, couple.TogetherID);
    }
}
