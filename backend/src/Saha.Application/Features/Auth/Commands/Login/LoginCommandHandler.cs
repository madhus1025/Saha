using MediatR;
using Microsoft.Extensions.Configuration;
using Saha.Application.Common.Exceptions;
using Saha.Application.Common.Interfaces;
using Saha.Domain.Entities;
using RefreshTokenEntity = Saha.Domain.Entities.RefreshToken;
using Saha.Domain.Interfaces.Repositories;
using Saha.Domain.Interfaces.Services;

namespace Saha.Application.Features.Auth.Commands.Login;

public sealed class LoginCommandHandler : IRequestHandler<LoginCommand, LoginResult>
{
    private readonly ICoupleRepository _coupleRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ITokenService _tokenService;
    private readonly IAuditLogger _auditLogger;
    private readonly ICurrentUserContext _currentUser;
    private readonly IConfiguration _configuration;

    public LoginCommandHandler(
        ICoupleRepository coupleRepository,
        IPasswordHasher passwordHasher,
        ITokenService tokenService,
        IAuditLogger auditLogger,
        ICurrentUserContext currentUser,
        IConfiguration configuration)
    {
        _coupleRepository = coupleRepository;
        _passwordHasher = passwordHasher;
        _tokenService = tokenService;
        _auditLogger = auditLogger;
        _currentUser = currentUser;
        _configuration = configuration;
    }

    public async Task<LoginResult> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        var couple = await _coupleRepository.GetByUsernameWithTokensAsync(
            request.Username.ToLowerInvariant(), cancellationToken);

        if (couple is null || !_passwordHasher.Verify(request.Password, couple.PasswordHash))
        {
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

        var accessToken = _tokenService.GenerateAccessToken(couple, partner);
        var refreshTokenValue = _tokenService.GenerateRefreshToken();
        var refreshTokenHash = _tokenService.HashToken(refreshTokenValue);

        var refreshTokenTtlDays = _configuration.GetValue("Jwt:RefreshTokenTtlDays", 30);
        var refreshTokenExpiry = DateTime.UtcNow.AddDays(refreshTokenTtlDays);
        var accessTokenTtlMinutes = _configuration.GetValue("Jwt:AccessTokenTtlMinutes", 15);
        var accessTokenExpiry = DateTime.UtcNow.AddMinutes(accessTokenTtlMinutes);

        var refreshToken = RefreshTokenEntity.Create(
            couple.Id,
            partner.Id,
            refreshTokenHash,
            refreshTokenExpiry,
            request.IpAddress ?? _currentUser.IpAddress ?? "unknown");

        couple.AddRefreshToken(refreshToken);
        await _coupleRepository.UpdateAsync(couple, cancellationToken);

        await _auditLogger.LogAsync(
            action: "LOGIN_SUCCESS",
            isSuccess: true,
            coupleId: couple.Id,
            partnerId: partner.Id,
            details: $"Username: {partner.Username}",
            ipAddress: request.IpAddress ?? _currentUser.IpAddress,
            userAgent: _currentUser.UserAgent,
            cancellationToken: cancellationToken);

        return new LoginResult(
            AccessToken: accessToken,
            RefreshToken: refreshTokenValue,
            AccessTokenExpiresAt: accessTokenExpiry,
            RefreshTokenExpiresAt: refreshTokenExpiry,
            CoupleId: couple.Id,
            PartnerId: partner.Id,
            Username: partner.Username,
            PartnerName: partner.Name,
            TogetherID: couple.TogetherID,
            Role: partner.Role.ToString(),
            ProfilePictureUrl: partner.ProfilePictureUrl);
    }
}
