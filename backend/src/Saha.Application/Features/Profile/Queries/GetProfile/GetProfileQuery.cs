using MediatR;

namespace Saha.Application.Features.Profile.Queries.GetProfile;

public sealed record GetProfileQuery(Guid CoupleId, Guid PartnerId) : IRequest<ProfileDto>;

public sealed record ProfileDto(
    Guid PartnerId,
    string Username,
    string Name,
    DateTime DateOfBirth,
    string Email,
    string PhoneNumber,
    string? ProfilePictureUrl,
    string Role,
    CoupleInfoDto CoupleInfo);

public sealed record CoupleInfoDto(
    Guid CoupleId,
    string TogetherID,
    PartnerSummaryDto Partner);

public sealed record PartnerSummaryDto(
    Guid PartnerId,
    string Username,
    string Name,
    string? ProfilePictureUrl,
    string Role);
