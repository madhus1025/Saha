using MediatR;

namespace Saha.Application.Features.Connect.Commands.RejectConnectionRequest;

public sealed record RejectConnectionRequestCommand(Guid ConnectionId, Guid RejectingCoupleId) : IRequest;
