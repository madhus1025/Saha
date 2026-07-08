using MediatR;
using Saha.Application.Features.Messaging.Common;

namespace Saha.Application.Features.Messaging.Queries.GetMessages;

public sealed record GetMessagesQuery(Guid ConversationId, string? Before, int Take = 30)
    : IRequest<MessagePageDto>;
