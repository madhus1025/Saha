using MediatR;
using Saha.Application.Common.Exceptions;
using Saha.Application.Common.Interfaces;
using Saha.Domain.Interfaces.Repositories;

namespace Saha.Application.Features.Auth.Commands.RefreshToken;

public sealed class RefreshTokenCommandHandler : IRequestHandler<RefreshTokenCommand, RefreshTokenResult>
{
    private readonly ICoupleRepository _coupleRepository;
    private readonly ITokenService _tokenService;
    private readonly IAuthTokenIssuer _tokenIssuer;
    private readonly IAuditLogger _auditLogger;
    private readonly ICurrentUserContext _currentUser;

    public RefreshTokenCommandHandler(
        ICoupleRepository coupleRepository,
        ITokenService tokenService,
        IAuthTokenIssuer tokenIssuer,
        IAuditLogger auditLogger,
        ICurrentUserContext currentUser)
    {
        _coupleRepository = coupleRepository;
        _tokenService = tokenService;
        _tokenIssuer = tokenIssuer;
        _auditLogger = auditLogger;
        _currentUser = currentUser;
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

        couple.RevokeRefreshToken(tokenHash, "Rotated");

        var tokens = _tokenIssuer.IssueFor(couple, partner, request.IpAddress ?? _currentUser.IpAddress);

        await _coupleRepository.UpdateAsync(couple, cancellationToken);

        await _auditLogger.LogAsync(
            action: "TOKEN_REFRESHED",
            isSuccess: true,
            coupleId: couple.Id,
            partnerId: partner.Id,
            ipAddress: request.IpAddress ?? _currentUser.IpAddress,
            cancellationToken: cancellationToken);

        return new RefreshTokenResult(
            tokens.AccessToken,
            tokens.RefreshToken,
            tokens.AccessTokenExpiresAt,
            tokens.RefreshTokenExpiresAt);
    }

    private async Task<Saha.Domain.Entities.Couple?> FindCoupleByRefreshTokenAsync(
        string tokenHash, CancellationToken cancellationToken)
    {
        // We need to find the couple that owns this refresh token
        // This is handled via a specialized query in the repository
        return await _coupleRepository.GetByRefreshTokenHashAsync(tokenHash, cancellationToken);
    }
}
