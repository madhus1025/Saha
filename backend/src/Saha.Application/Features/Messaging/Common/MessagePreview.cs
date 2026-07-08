using Saha.Domain.Entities;
using Saha.Domain.Enums;

namespace Saha.Application.Features.Messaging.Common;

/// <summary>Builds the denormalized last-message preview string shown in the conversation list.</summary>
public static class MessagePreview
{
    public static string For(Message message) => message.ContentType switch
    {
        MessageContentType.Image => string.IsNullOrWhiteSpace(message.Body) ? "📷 Photo" : $"📷 {message.Body}",
        MessageContentType.Video => string.IsNullOrWhiteSpace(message.Body) ? "🎬 Video" : $"🎬 {message.Body}",
        _ => message.Body ?? string.Empty
    };
}
