using MediatR;
using Microsoft.Extensions.Configuration;
using Saha.Application.Common.Exceptions;
using Saha.Application.Common.Interfaces;
using Saha.Domain.Entities;
using RefreshTokenEntity = Saha.Domain.Entities.RefreshToken;
using Saha.Domain.Interfaces.Repositories;

namespace Saha.Application.Features.Auth.Commands.RefreshToken;

public sealed class RefreshTokenCommandHandler : IRequestHandler<RefreshTokenCommand, RefreshTokenResult>
{
    private readonly ICoupleRepository _coupleRepository;
    private readonly ITokenService _tokenService;
    private readonly IAuditLogger _auditLogger;
    private readonly ICurrentUserContext _currentUser;
    private readonly IConfiguration _configuration;

    public RefreshTokenCommandHandler(
        ICoupleRepository coupleRepository,
        ITokenService tokenService,
        IAuditLogger auditLogger,
        ICurrentUserContext currentUser,
        IConfiguration configuration)
    {
        _coupleRepository = coupleRepository;
        _tokenService = tokenService;
        _auditLogger = auditLogger;
        _currentUser = currentUser;
        _configuration = configuration;
    }

    public async Task<RefreshTokenResult> Handle(RefreshTokenCommand request, CancellationToken cancellationToken)
    {
        var tokenHash = _tokenService.HashToken(request.RefreshToken);

        var couple = await FindCoupleByRefreshTokenAsync(tokenHash, cancellationToken);
        if (couple is null)
            throw new UnauthorizedException("Refresh token is invalid or expired.");

        var storedToken = couple.FindActiveRefreshToken(tokenHash);
        if (storedToken is null)
            throw new UnauthorizedException("Refresh token is invalid or expired.");

        var partner = couple.GetPartner(storedToken.PartnerId);

        var newAccessToken = _tokenService.GenerateAccessToken(couple, partner);
        var newRefreshTokenValue = _tokenService.GenerateRefreshToken();
        var newRefreshTokenHash = _tokenService.HashToken(newRefreshTokenValue);

        var refreshTokenTtlDays = _configuration.GetValue("Jwt:RefreshTokenTtlDays", 30);
        var accessTokenTtlMinutes = _configuration.GetValue("Jwt:AccessTokenTtlMinutes", 15);
        var refreshTokenExpiry = DateTime.UtcNow.AddDays(refreshTokenTtlDays);
        var accessTokenExpiry = DateTime.UtcNow.AddMinutes(accessTokenTtlMinutes);

        couple.RevokeRefreshToken(tokenHash, "Rotated");

        var newRefreshToken = RefreshTokenEntity.Create(
            couple.Id,
            partner.Id,
            newRefreshTokenHash,
            refreshTokenExpiry,
            request.IpAddress ?? _currentUser.IpAddress ?? "unknown");

        couple.AddRefreshToken(newRefreshToken);
        await _coupleRepository.UpdateAsync(couple, cancellationToken);

        await _auditLogger.LogAsync(
            action: "TOKEN_REFRESHED",
            isSuccess: true,
            coupleId: couple.Id,
            partnerId: partner.Id,
            ipAddress: request.IpAddress ?? _currentUser.IpAddress,
            cancellationToken: cancellationToken);

        return new RefreshTokenResult(
            newAccessToken,
            newRefreshTokenValue,
            accessTokenExpiry,
            refreshTokenExpiry);
    }

    private async Task<Saha.Domain.Entities.Couple?> FindCoupleByRefreshTokenAsync(
        string tokenHash, CancellationToken cancellationToken)
    {
        // We need to find the couple that owns this refresh token
        // This is handled via a specialized query in the repository
        return await _coupleRepository.GetByRefreshTokenHashAsync(tokenHash, cancellationToken);
    }
}
