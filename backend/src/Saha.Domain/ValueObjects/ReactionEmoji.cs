using Saha.Domain.Exceptions;

namespace Saha.Domain.ValueObjects;

public sealed record ReactionEmoji
{
    /// <summary>Curated allowlist of reaction tokens (rendered to emoji on the frontend).</summary>
    public static readonly IReadOnlySet<string> Allowed =
        new HashSet<string> { "heart", "laugh", "wow", "sad", "thumbsup", "fire" };

    public string Value { get; }

    private ReactionEmoji(string value) => Value = value;

    public static ReactionEmoji Create(string value)
    {
        var normalized = (value ?? string.Empty).Trim().ToLowerInvariant();

        if (!Allowed.Contains(normalized))
            throw new DomainValidationException(nameof(ReactionEmoji),
                $"'{value}' is not a supported reaction.");

        return new ReactionEmoji(normalized);
    }

    public override string ToString() => Value;

    public static implicit operator string(ReactionEmoji emoji) => emoji.Value;
}
