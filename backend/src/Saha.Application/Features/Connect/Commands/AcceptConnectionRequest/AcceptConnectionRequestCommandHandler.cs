using MediatR;
using Saha.Application.Common.Exceptions;
using Saha.Application.Common.Interfaces;
using Saha.Domain.Interfaces.Repositories;

namespace Saha.Application.Features.Connect.Commands.AcceptConnectionRequest;

public sealed class AcceptConnectionRequestCommandHandler : IRequestHandler<AcceptConnectionRequestCommand>
{
    private readonly IConnectionRepository _connectionRepository;
    private readonly ICoupleRepository _coupleRepository;
    private readonly IAuditLogger _auditLogger;
    private readonly ICurrentUserContext _currentUser;

    public AcceptConnectionRequestCommandHandler(
        IConnectionRepository connectionRepository,
        ICoupleRepository coupleRepository,
        IAuditLogger auditLogger,
        ICurrentUserContext currentUser)
    {
        _connectionRepository = connectionRepository;
        _coupleRepository = coupleRepository;
        _auditLogger = auditLogger;
        _currentUser = currentUser;
    }

    public async Task Handle(AcceptConnectionRequestCommand request, CancellationToken cancellationToken)
    {
        if (_currentUser.CoupleId != request.AcceptingCoupleId)
            throw new ForbiddenException("Cannot accept connection request on behalf of another couple.");

        var connection = await _connectionRepository.GetByIdAsync(request.ConnectionId, cancellationToken);

        if (connection is null)
            throw new NotFoundException("CoupleConnection", request.ConnectionId);

        if (connection.CoupleBId != request.AcceptingCoupleId)
            throw new ForbiddenException("This connection request was not sent to your couple.");

        var coupleA = await _coupleRepository.GetByIdAsync(connection.CoupleAId, cancellationToken);
        var coupleB = await _coupleRepository.GetByIdAsync(connection.CoupleBId, cancellationToken);

        if (coupleA is null || coupleB is null)
            throw new NotFoundException("Couple", "One of the couples in this connection no longer exists.");

        connection.Accept(coupleA.TogetherID, coupleB.TogetherID);
        await _connectionRepository.UpdateAsync(connection, cancellationToken);

        await _auditLogger.LogAsync(
            action: "CONNECTION_ACCEPTED",
            isSuccess: true,
            coupleId: request.AcceptingCoupleId,
            resourceType: "CoupleConnection",
            resourceId: connection.Id,
            ipAddress: _currentUser.IpAddress,
            cancellationToken: cancellationToken);
    }
}
