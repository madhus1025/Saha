using System.Diagnostics;
using MediatR;
using Saha.Application.Common.Exceptions;
using Saha.Application.Common.Interfaces;
using Saha.Application.Common.Persistence;
using Saha.Application.Features.Auth.Common;
using Saha.Application.Telemetry;
using Saha.Domain.Entities;
using Saha.Domain.Interfaces.Repositories;
using Saha.Domain.Interfaces.Services;

namespace Saha.Application.Features.Auth.Commands.Register;

public sealed class RegisterCoupleCommandHandler : IRequestHandler<RegisterCoupleCommand, AuthResult>
{
    private readonly ICoupleRepository _coupleRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IAuthTokenIssuer _tokenIssuer;
    private readonly IAuditLogger _auditLogger;
    private readonly ICurrentUserContext _currentUser;
    private readonly AuthMetrics _authMetrics;

    public RegisterCoupleCommandHandler(
        ICoupleRepository coupleRepository,
        IPasswordHasher passwordHasher,
        IAuthTokenIssuer tokenIssuer,
        IAuditLogger auditLogger,
        ICurrentUserContext currentUser,
        AuthMetrics authMetrics)
    {
        _coupleRepository = coupleRepository;
        _passwordHasher = passwordHasher;
        _tokenIssuer = tokenIssuer;
        _auditLogger = auditLogger;
        _currentUser = currentUser;
        _authMetrics = authMetrics;
    }

    public async Task<AuthResult> Handle(RegisterCoupleCommand request, CancellationToken cancellationToken)
    {
        var sw = Stopwatch.StartNew();
        _authMetrics.RecordRegisterAttempt();

        var normalizedTogetherId = request.TogetherID.Trim().ToUpperInvariant();
        var normalizedUsername = request.Username.Trim().ToLowerInvariant();

        // Friendly pre-checks. They are not the correctness boundary — the unique indexes are.
        // Between this check and SaveChanges another registration can claim the same name.
        if (await _coupleRepository.ExistsByTogetherIDAsync(normalizedTogetherId, cancellationToken))
            throw TogetherIdTaken(normalizedTogetherId, sw);

        if (await _coupleRepository.ExistsByUsernameAsync(normalizedUsername, cancellationToken))
            throw UsernameTaken(normalizedUsername, sw);

        var couple = Couple.Register(
            normalizedTogetherId,
            normalizedUsername,
            request.Name,
            request.DateOfBirth,
            request.Email,
            request.PhoneNumber,
            request.Role,
            _passwordHasher.Hash(request.Password));

        var registrant = couple.Partners[0];
        var tokens = _tokenIssuer.IssueFor(couple, registrant, request.IpAddress ?? _currentUser.IpAddress);

        try
        {
            await _coupleRepository.AddAsync(couple, cancellationToken);
        }
        catch (Exception ex) when (UniqueConstraint.IsViolation(ex))
        {
            // Lost the race. Which name went first is not worth another round trip: report the
            // TogetherID, which the user chose most recently, and let them pick again.
            throw TogetherIdTaken(normalizedTogetherId, sw);
        }

        sw.Stop();
        _authMetrics.RecordRegisterSuccess(sw.Elapsed.TotalMilliseconds);

        await _auditLogger.LogAsync(
            action: "COUPLE_REGISTERED",
            isSuccess: true,
            coupleId: couple.Id,
            partnerId: registrant.Id,
            details: $"Together ID: {normalizedTogetherId}",
            ipAddress: request.IpAddress ?? _currentUser.IpAddress,
            userAgent: _currentUser.UserAgent,
            cancellationToken: cancellationToken);

        return AuthResult.From(couple, registrant, tokens);
    }

    private ConflictException TogetherIdTaken(string togetherId, Stopwatch sw)
    {
        sw.Stop();
        _authMetrics.RecordRegisterFailure("TOGETHER_ID_TAKEN", sw.Elapsed.TotalMilliseconds);
        return new ConflictException("TOGETHER_ID_TAKEN", $"'{togetherId}' is already someone's door.");
    }

    private ConflictException UsernameTaken(string username, Stopwatch sw)
    {
        sw.Stop();
        _authMetrics.RecordRegisterFailure("USERNAME_TAKEN", sw.Elapsed.TotalMilliseconds);
        return new ConflictException("USERNAME_TAKEN", $"'{username}' is already taken.");
    }
}
