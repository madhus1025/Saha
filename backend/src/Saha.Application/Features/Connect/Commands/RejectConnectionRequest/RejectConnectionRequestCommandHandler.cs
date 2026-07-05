using MediatR;
using Saha.Application.Common.Exceptions;
using Saha.Application.Common.Interfaces;
using Saha.Domain.Interfaces.Repositories;

namespace Saha.Application.Features.Connect.Commands.RejectConnectionRequest;

public sealed class RejectConnectionRequestCommandHandler : IRequestHandler<RejectConnectionRequestCommand>
{
    private readonly IConnectionRepository _connectionRepository;
    private readonly IAuditLogger _auditLogger;
    private readonly ICurrentUserContext _currentUser;

    public RejectConnectionRequestCommandHandler(
        IConnectionRepository connectionRepository,
        IAuditLogger auditLogger,
        ICurrentUserContext currentUser)
    {
        _connectionRepository = connectionRepository;
        _auditLogger = auditLogger;
        _currentUser = currentUser;
    }

    public async Task Handle(RejectConnectionRequestCommand request, CancellationToken cancellationToken)
    {
        if (_currentUser.CoupleId != request.RejectingCoupleId)
            throw new ForbiddenException("Cannot reject a connection request on behalf of another couple.");

        var connection = await _connectionRepository.GetByIdAsync(request.ConnectionId, cancellationToken);

        if (connection is null)
            throw new NotFoundException("CoupleConnection", request.ConnectionId);

        if (connection.CoupleBId != request.RejectingCoupleId)
            throw new ForbiddenException("This connection request was not sent to your couple.");

        connection.Reject();
        await _connectionRepository.UpdateAsync(connection, cancellationToken);

        await _auditLogger.LogAsync(
            action: "CONNECTION_REJECTED",
            isSuccess: true,
            coupleId: request.RejectingCoupleId,
            resourceType: "CoupleConnection",
            resourceId: connection.Id,
            ipAddress: _currentUser.IpAddress,
            cancellationToken: cancellationToken);
    }
}
