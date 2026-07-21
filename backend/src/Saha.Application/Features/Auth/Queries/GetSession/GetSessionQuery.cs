using MediatR;

namespace Saha.Application.Features.Auth.Queries.GetSession;

/// <summary>
/// The caller's current couple state, read fresh from the couple rather than from the access token.
/// The token lives 15 minutes; a registrant whose partner has just accepted must not wait that long
/// to be let into their home.
/// </summary>
public sealed record GetSessionQuery(Guid CoupleId, Guid PartnerId) : IRequest<SessionDto>;

public sealed record SessionDto(
    Guid CoupleId,
    Guid PartnerId,
    string Username,
    string PartnerName,
    string TogetherID,
    string Role,
    string? ProfilePictureUrl,
    string CoupleState);
