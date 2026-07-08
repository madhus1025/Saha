using MediatR;

namespace Saha.Application.Features.Messaging.Commands.DeleteMessage;

public sealed record DeleteMessageCommand(Guid ConversationId, Guid MessageId) : IRequest;
