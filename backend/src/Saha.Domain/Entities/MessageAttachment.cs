namespace Saha.Domain.Entities;

/// <summary>Single media attachment (0..1) belonging to a <see cref="Message"/>.</summary>
public sealed class MessageAttachment : Entity
{
    public Guid MessageId { get; private set; }
    public string Url { get; private set; } = default!;
    public string ContentType { get; private set; } = default!;
    public string FileName { get; private set; } = default!;
    public long SizeBytes { get; private set; }

    private MessageAttachment() { }

    public static MessageAttachment Create(string url, string contentType, string fileName, long sizeBytes)
    {
        return new MessageAttachment
        {
            Id = Guid.NewGuid(),
            Url = url,
            ContentType = contentType,
            FileName = fileName,
            SizeBytes = sizeBytes
        };
    }
}
