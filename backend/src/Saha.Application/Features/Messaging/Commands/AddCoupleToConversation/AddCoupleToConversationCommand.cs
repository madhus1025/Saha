using MediatR;

namespace Saha.Application.Features.Messaging.Commands.AddCoupleToConversation;

public sealed record AddCoupleToConversationCommand(Guid ConversationId, Guid TargetCoupleId) : IRequest;
