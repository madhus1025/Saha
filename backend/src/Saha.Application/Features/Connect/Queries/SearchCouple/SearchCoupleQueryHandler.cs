using MediatR;
using Saha.Application.Common.Interfaces;
using Saha.Domain.Interfaces.Repositories;

namespace Saha.Application.Features.Connect.Queries.SearchCouple;

public sealed class SearchCoupleQueryHandler
    : IRequestHandler<SearchCoupleQuery, IReadOnlyList<CoupleSearchResultDto>>
{
    private readonly ICoupleRepository _coupleRepository;
    private readonly IConnectionRepository _connectionRepository;
    private readonly ICurrentUserContext _currentUser;

    public SearchCoupleQueryHandler(
        ICoupleRepository coupleRepository,
        IConnectionRepository connectionRepository,
        ICurrentUserContext currentUser)
    {
        _coupleRepository = coupleRepository;
        _connectionRepository = connectionRepository;
        _currentUser = currentUser;
    }

    public async Task<IReadOnlyList<CoupleSearchResultDto>> Handle(
        SearchCoupleQuery request,
        CancellationToken cancellationToken)
    {
        var couples = await _coupleRepository.SearchByTogetherIDAsync(
            request.TogetherID.ToUpperInvariant(), 10, cancellationToken);

        var results = new List<CoupleSearchResultDto>();

        foreach (var couple in couples)
        {
            if (couple.Id == request.RequesterCoupleId) continue;

            var connection = await _connectionRepository.GetBetweenCouplesAsync(
                request.RequesterCoupleId, couple.Id, cancellationToken);

            results.Add(new CoupleSearchResultDto(
                TogetherID: couple.TogetherID,
                HusbandName: couple.Husband.Name,
                WifeName: couple.Wife.Name,
                HusbandProfilePictureUrl: couple.Husband.ProfilePictureUrl,
                WifeProfilePictureUrl: couple.Wife.ProfilePictureUrl,
                ExistingConnectionStatus: connection?.Status.ToString()));
        }

        return results.AsReadOnly();
    }
}
