using MediatR;
using Saha.Application.Features.Messaging.Common;

namespace Saha.Application.Features.Messaging.Queries.GetConversations;

public sealed record GetConversationsQuery : IRequest<IReadOnlyList<ConversationSummaryDto>>;
