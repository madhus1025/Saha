using MediatR;

namespace Saha.Application.Features.Messaging.Commands.SetConversationPin;

public sealed record SetConversationPinCommand(Guid ConversationId, bool IsPinned) : IRequest;
