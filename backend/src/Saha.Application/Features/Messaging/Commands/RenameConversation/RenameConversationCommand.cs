using MediatR;

namespace Saha.Application.Features.Messaging.Commands.RenameConversation;

public sealed record RenameConversationCommand(Guid ConversationId, string Name) : IRequest;
