using MediatR;

namespace Saha.Application.Features.Messaging.Commands.RemoveReaction;

public sealed record RemoveReactionCommand(Guid ConversationId, Guid MessageId) : IRequest;
