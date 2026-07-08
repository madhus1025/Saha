using MediatR;

namespace Saha.Application.Features.Messaging.Commands.HideConversation;

public sealed record HideConversationCommand(Guid ConversationId) : IRequest;
