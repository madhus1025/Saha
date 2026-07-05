using MediatR;
using Saha.Application.Common.Exceptions;
using Saha.Application.Common.Interfaces;
using Saha.Domain.Entities;
using Saha.Domain.Enums;
using Saha.Domain.Interfaces.Repositories;

namespace Saha.Application.Features.Connect.Commands.SendConnectionRequest;

public sealed class SendConnectionRequestCommandHandler
    : IRequestHandler<SendConnectionRequestCommand, SendConnectionRequestResult>
{
    private readonly ICoupleRepository _coupleRepository;
    private readonly IConnectionRepository _connectionRepository;
    private readonly IAuditLogger _auditLogger;
    private readonly ICurrentUserContext _currentUser;

    public SendConnectionRequestCommandHandler(
        ICoupleRepository coupleRepository,
        IConnectionRepository connectionRepository,
        IAuditLogger auditLogger,
        ICurrentUserContext currentUser)
    {
        _coupleRepository = coupleRepository;
        _connectionRepository = connectionRepository;
        _auditLogger = auditLogger;
        _currentUser = currentUser;
    }

    public async Task<SendConnectionRequestResult> Handle(
        SendConnectionRequestCommand request,
        CancellationToken cancellationToken)
    {
        if (_currentUser.CoupleId != request.RequesterCoupleId)
            throw new ForbiddenException("Cannot send connection request on behalf of another couple.");

        var requesterCouple = await _coupleRepository.GetByIdAsync(request.RequesterCoupleId, cancellationToken);
        if (requesterCouple is null)
            throw new NotFoundException("Couple", request.RequesterCoupleId);

        var targetCouple = await _coupleRepository.GetByTogetherIDAsync(
            request.TargetTogetherID.ToUpperInvariant(), cancellationToken);

        if (targetCouple is null)
            throw new NotFoundException("Couple", request.TargetTogetherID);

        if (targetCouple.Id == request.RequesterCoupleId)
            throw new ConflictException("SELF_CONNECTION", "Cannot connect with your own couple.");

        var existingConnection = await _connectionRepository.GetBetweenCouplesAsync(
            request.RequesterCoupleId, targetCouple.Id, cancellationToken);

        if (existingConnection is not null)
        {
            if (existingConnection.Status == ConnectionRequestStatus.Accepted)
                throw new ConflictException("ALREADY_CONNECTED", "You are already connected with this couple.");

            if (existingConnection.Status == ConnectionRequestStatus.Pending)
                throw new ConflictException("REQUEST_PENDING", "A connection request is already pending.");
        }

        var connection = CoupleConnection.CreateRequest(
            request.RequesterCoupleId,
            targetCouple.Id,
            requesterCouple.TogetherID,
            targetCouple.TogetherID);

        await _connectionRepository.AddAsync(connection, cancellationToken);

        await _auditLogger.LogAsync(
            action: "CONNECTION_REQUEST_SENT",
            isSuccess: true,
            coupleId: request.RequesterCoupleId,
            resourceType: "CoupleConnection",
            resourceId: connection.Id,
            details: $"Target: {targetCouple.TogetherID}",
            ipAddress: _currentUser.IpAddress,
            cancellationToken: cancellationToken);

        return new SendConnectionRequestResult(connection.Id);
    }
}
