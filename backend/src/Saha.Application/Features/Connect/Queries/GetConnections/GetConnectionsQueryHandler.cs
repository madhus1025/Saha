using MediatR;
using Saha.Application.Common.Exceptions;
using Saha.Application.Common.Interfaces;
using Saha.Domain.Interfaces.Repositories;

namespace Saha.Application.Features.Connect.Queries.GetConnections;

public sealed class GetConnectionsQueryHandler : IRequestHandler<GetConnectionsQuery, IReadOnlyList<ConnectionDto>>
{
    private readonly IConnectionRepository _connectionRepository;
    private readonly ICoupleRepository _coupleRepository;
    private readonly ICurrentUserContext _currentUser;

    public GetConnectionsQueryHandler(
        IConnectionRepository connectionRepository,
        ICoupleRepository coupleRepository,
        ICurrentUserContext currentUser)
    {
        _connectionRepository = connectionRepository;
        _coupleRepository = coupleRepository;
        _currentUser = currentUser;
    }

    public async Task<IReadOnlyList<ConnectionDto>> Handle(
        GetConnectionsQuery request,
        CancellationToken cancellationToken)
    {
        if (_currentUser.CoupleId != request.CoupleId)
            throw new ForbiddenException("Cannot view connections for another couple.");

        var connections = await _connectionRepository.GetByCoupleIdAsync(
            request.CoupleId, request.Status, cancellationToken);

        var dtos = new List<ConnectionDto>();

        foreach (var connection in connections)
        {
            var otherCoupleId = connection.CoupleAId == request.CoupleId
                ? connection.CoupleBId
                : connection.CoupleAId;

            var otherCouple = await _coupleRepository.GetByIdAsync(otherCoupleId, cancellationToken);
            if (otherCouple is null) continue;

            dtos.Add(new ConnectionDto(
                ConnectionId: connection.Id,
                TogetherID: otherCouple.TogetherID,
                HusbandName: otherCouple.Husband.Name,
                WifeName: otherCouple.Wife.Name,
                HusbandProfilePictureUrl: otherCouple.Husband.ProfilePictureUrl,
                WifeProfilePictureUrl: otherCouple.Wife.ProfilePictureUrl,
                Status: connection.Status.ToString(),
                IsInitiator: connection.InitiatedByCoupleId == request.CoupleId,
                CreatedAt: connection.CreatedAt,
                AcceptedAt: connection.AcceptedAt));
        }

        return dtos.AsReadOnly();
    }
}
