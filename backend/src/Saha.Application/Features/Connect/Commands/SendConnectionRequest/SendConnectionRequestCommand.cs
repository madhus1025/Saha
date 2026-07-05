using MediatR;

namespace Saha.Application.Features.Connect.Commands.SendConnectionRequest;

public sealed record SendConnectionRequestCommand(
    Guid RequesterCoupleId,
    string TargetTogetherID) : IRequest<SendConnectionRequestResult>;

public sealed record SendConnectionRequestResult(Guid ConnectionId);
