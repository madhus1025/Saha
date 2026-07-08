using MediatR;
using Saha.Application.Features.Messaging.Common;

namespace Saha.Application.Features.Messaging.Commands.SendMediaMessage;

public sealed record SendMediaMessageCommand(
    Guid ConversationId,
    Stream FileStream,
    string FileName,
    string ContentType,
    long SizeBytes,
    string? Caption) : IRequest<MessageDto>;
