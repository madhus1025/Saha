using Saha.Domain.Entities;
using Saha.Application.Common.Interfaces;

namespace Saha.Application.Features.Auth.Common;

/// <summary>
/// The shape returned by every entry point that authenticates a partner: login, registration, and
/// invitation acceptance. <see cref="CoupleState"/> tells the client whether the home is open yet.
/// </summary>
public sealed record AuthResult(
    string AccessToken,
    string RefreshToken,
    DateTime AccessTokenExpiresAt,
    DateTime RefreshTokenExpiresAt,
    Guid CoupleId,
    Guid PartnerId,
    string Username,
    string PartnerName,
    string TogetherID,
    string Role,
    string? ProfilePictureUrl,
    string CoupleState)
{
    public static AuthResult From(Couple couple, Partner partner, IssuedTokens tokens) =>
        new(
            AccessToken: tokens.AccessToken,
            RefreshToken: tokens.RefreshToken,
            AccessTokenExpiresAt: tokens.AccessTokenExpiresAt,
            RefreshTokenExpiresAt: tokens.RefreshTokenExpiresAt,
            CoupleId: couple.Id,
            PartnerId: partner.Id,
            Username: partner.Username,
            PartnerName: partner.Name,
            TogetherID: couple.TogetherID,
            Role: partner.Role.ToString(),
            ProfilePictureUrl: partner.ProfilePictureUrl,
            CoupleState: couple.State.ToString());
}
