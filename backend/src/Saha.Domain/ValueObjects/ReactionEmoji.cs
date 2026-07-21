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

        // State the constraint rather than echoing the caller's input: reflecting attacker-controlled
        // text into an error string turns any consumer that renders errors as HTML into an
        // injection sink, and the caller already knows what it sent.
        if (!Allowed.Contains(normalized))
            throw new DomainValidationException(nameof(ReactionEmoji),
                $"Reaction must be one of: {string.Join(", ", Allowed.Order())}.");

        return new ReactionEmoji(normalized);
    }

    public override string ToString() => Value;

    public static implicit operator string(ReactionEmoji emoji) => emoji.Value;
}
