using Saha.Domain.Entities;

namespace Saha.Application.Common.Interfaces;

public sealed record IssuedTokens(
    string AccessToken,
    string RefreshToken,
    DateTime AccessTokenExpiresAt,
    DateTime RefreshTokenExpiresAt);

/// <summary>
/// Issues an access/refresh token pair for a partner and attaches the refresh token to the couple.
/// Shared by login, registration, and invitation acceptance so token TTLs and hashing cannot drift
/// between the three entry points.
/// </summary>
public interface IAuthTokenIssuer
{
    /// <summary>
    /// Attaches a new hashed refresh token to <paramref name="couple"/>. The caller is responsible
    /// for persisting the couple.
    /// </summary>
    IssuedTokens IssueFor(Couple couple, Partner partner, string? ipAddress);
}
