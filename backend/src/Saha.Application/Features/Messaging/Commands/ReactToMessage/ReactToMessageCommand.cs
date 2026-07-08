using MediatR;

namespace Saha.Application.Features.Messaging.Commands.ReactToMessage;

public sealed record ReactToMessageCommand(Guid ConversationId, Guid MessageId, string Emoji) : IRequest;
