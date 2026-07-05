using MediatR;

namespace Saha.Application.Features.Connect.Commands.AcceptConnectionRequest;

public sealed record AcceptConnectionRequestCommand(Guid ConnectionId, Guid AcceptingCoupleId) : IRequest;
