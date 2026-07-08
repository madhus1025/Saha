using MediatR;
using Saha.Application.Features.Messaging.Common;

namespace Saha.Application.Features.Messaging.Queries.GetConversationDetail;

public sealed record GetConversationDetailQuery(Guid ConversationId) : IRequest<ConversationDetailDto>;
