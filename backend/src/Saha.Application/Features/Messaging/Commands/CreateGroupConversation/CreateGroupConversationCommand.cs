using MediatR;

namespace Saha.Application.Features.Messaging.Commands.CreateGroupConversation;

public sealed record CreateGroupConversationCommand(string Name, IReadOnlyList<Guid> TargetCoupleIds)
    : IRequest<CreateGroupConversationResult>;

public sealed record CreateGroupConversationResult(Guid ConversationId);
