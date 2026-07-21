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

            // Unreachable while connections can only be formed with complete couples, but a
            // connection outlives nothing and a fault here would break the whole list.
            if (!otherCouple.IsComplete) continue;

            var husband = otherCouple.RequireHusband();
            var wife = otherCouple.RequireWife();

            dtos.Add(new ConnectionDto(
                ConnectionId: connection.Id,
                CoupleId: otherCoupleId,
                TogetherID: otherCouple.TogetherID,
                HusbandName: husband.Name,
                WifeName: wife.Name,
                HusbandProfilePictureUrl: husband.ProfilePictureUrl,
                WifeProfilePictureUrl: wife.ProfilePictureUrl,
                Status: connection.Status.ToString(),
                IsInitiator: connection.InitiatedByCoupleId == request.CoupleId,
                CreatedAt: connection.CreatedAt,
                AcceptedAt: connection.AcceptedAt));
        }

        return dtos.AsReadOnly();
    }
}
