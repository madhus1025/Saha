using Microsoft.Extensions.Configuration;
using Saha.Application.Common.Interfaces;
using Saha.Domain.Entities;
using RefreshTokenEntity = Saha.Domain.Entities.RefreshToken;

namespace Saha.Infrastructure.Services.Auth;

public sealed class AuthTokenIssuer : IAuthTokenIssuer
{
    private const int DefaultAccessTokenTtlMinutes = 15;
    private const int DefaultRefreshTokenTtlDays = 30;

    private readonly ITokenService _tokenService;
    private readonly IConfiguration _configuration;

    public AuthTokenIssuer(ITokenService tokenService, IConfiguration configuration)
    {
        _tokenService = tokenService;
        _configuration = configuration;
    }

    public IssuedTokens IssueFor(Couple couple, Partner partner, string? ipAddress)
    {
        var accessToken = _tokenService.GenerateAccessToken(couple, partner);
        var refreshTokenValue = _tokenService.GenerateRefreshToken();
        var refreshTokenHash = _tokenService.HashToken(refreshTokenValue);

        var accessTokenExpiry = DateTime.UtcNow.AddMinutes(
            _configuration.GetValue("Jwt:AccessTokenTtlMinutes", DefaultAccessTokenTtlMinutes));
        var refreshTokenExpiry = DateTime.UtcNow.AddDays(
            _configuration.GetValue("Jwt:RefreshTokenTtlDays", DefaultRefreshTokenTtlDays));

        couple.AddRefreshToken(RefreshTokenEntity.Create(
            couple.Id,
            partner.Id,
            refreshTokenHash,
            refreshTokenExpiry,
            ipAddress ?? "unknown"));

        return new IssuedTokens(accessToken, refreshTokenValue, accessTokenExpiry, refreshTokenExpiry);
    }
}
