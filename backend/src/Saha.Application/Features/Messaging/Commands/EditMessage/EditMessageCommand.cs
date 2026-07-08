using MediatR;
using Saha.Application.Features.Messaging.Common;

namespace Saha.Application.Features.Messaging.Commands.EditMessage;

public sealed record EditMessageCommand(Guid ConversationId, Guid MessageId, string Body)
    : IRequest<MessageDto>;
