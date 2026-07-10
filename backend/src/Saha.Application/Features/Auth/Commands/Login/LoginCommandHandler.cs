using System.Diagnostics;
using MediatR;
using Saha.Application.Common.Exceptions;
using Saha.Application.Common.Interfaces;
using Saha.Application.Features.Auth.Common;
using Saha.Application.Telemetry;
using Saha.Domain.Interfaces.Repositories;
using Saha.Domain.Interfaces.Services;

namespace Saha.Application.Features.Auth.Commands.Login;

public sealed class LoginCommandHandler : IRequestHandler<LoginCommand, AuthResult>
{
    private readonly ICoupleRepository _coupleRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IAuthTokenIssuer _tokenIssuer;
    private readonly IAuditLogger _auditLogger;
    private readonly ICurrentUserContext _currentUser;
    private readonly AuthMetrics _authMetrics;

    public LoginCommandHandler(
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

    public async Task<AuthResult> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        var sw = Stopwatch.StartNew();
        _authMetrics.RecordLoginAttempt();

        var couple = await _coupleRepository.GetByUsernameWithTokensAsync(
            request.Username.ToLowerInvariant(), cancellationToken);

        if (couple is null || !_passwordHasher.Verify(request.Password, couple.PasswordHash))
        {
            sw.Stop();
            _authMetrics.RecordLoginFailure("INVALID_CREDENTIALS", sw.Elapsed.TotalMilliseconds);

            await _auditLogger.LogAsync(
                action: "LOGIN_FAILED",
                isSuccess: false,
                details: $"Username: {request.Username}",
                ipAddress: request.IpAddress ?? _currentUser.IpAddress,
                errorCode: "INVALID_CREDENTIALS",
                cancellationToken: cancellationToken);

            throw new UnauthorizedException("Invalid username or password.");
        }

        if (!couple.IsActive)
        {
            sw.Stop();
            _authMetrics.RecordLoginFailure("ACCOUNT_INACTIVE", sw.Elapsed.TotalMilliseconds);

            await _auditLogger.LogAsync(
                action: "LOGIN_FAILED",
                isSuccess: false,
                coupleId: couple.Id,
                details: "Account is deactivated",
                ipAddress: request.IpAddress ?? _currentUser.IpAddress,
                errorCode: "ACCOUNT_INACTIVE",
                cancellationToken: cancellationToken);

            throw new UnauthorizedException("Account is deactivated.");
        }

        var partner = couple.FindPartnerByUsername(request.Username.ToLowerInvariant())!;

        var tokens = _tokenIssuer.IssueFor(couple, partner, request.IpAddress ?? _currentUser.IpAddress);

        await _coupleRepository.UpdateAsync(couple, cancellationToken);

        sw.Stop();
        _authMetrics.RecordLoginSuccess(sw.Elapsed.TotalMilliseconds);

        await _auditLogger.LogAsync(
            action: "LOGIN_SUCCESS",
            isSuccess: true,
            coupleId: couple.Id,
            partnerId: partner.Id,
            details: $"Username: {partner.Username}",
            ipAddress: request.IpAddress ?? _currentUser.IpAddress,
            userAgent: _currentUser.UserAgent,
            cancellationToken: cancellationToken);

        return AuthResult.From(couple, partner, tokens);
    }
}
