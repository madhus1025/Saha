using MediatR;

namespace Saha.Application.Features.Connect.Queries.SearchCouple;

public sealed record SearchCoupleQuery(string TogetherID, Guid RequesterCoupleId)
    : IRequest<IReadOnlyList<CoupleSearchResultDto>>;

public sealed record CoupleSearchResultDto(
    string TogetherID,
    string HusbandName,
    string WifeName,
    string? HusbandProfilePictureUrl,
    string? WifeProfilePictureUrl,
    string? ExistingConnectionStatus);
