using MediatR;
using Saha.Application.Features.Messaging.Common;

namespace Saha.Application.Features.Messaging.Commands.SendTextMessage;

public sealed record SendTextMessageCommand(Guid ConversationId, string Body) : IRequest<MessageDto>;
