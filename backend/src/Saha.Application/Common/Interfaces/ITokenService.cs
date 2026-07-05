using Saha.Domain.Entities;

namespace Saha.Application.Common.Interfaces;

public record TokenResult(
    string AccessToken,
    string RefreshToken,
    DateTime AccessTokenExpiresAt,
    DateTime RefreshTokenExpiresAt);

public interface ITokenService
{
    string GenerateAccessToken(Couple couple, Partner partner);
    string GenerateRefreshToken();
    string HashToken(string token);
    ClaimsResult? ValidateAccessToken(string accessToken);
}

public record ClaimsResult(
    Guid CoupleId,
    Guid PartnerId,
    string Username,
    string TogetherID,
    string Role);
