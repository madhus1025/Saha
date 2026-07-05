using Saha.Domain.Exceptions;

namespace Saha.Domain.ValueObjects;

public sealed record TogetherID
{
    private const int MaxLength = 50;
    private static readonly System.Text.RegularExpressions.Regex ValidPattern =
        new(@"^[A-Z0-9][A-Z0-9\-]{2,48}[A-Z0-9]$", System.Text.RegularExpressions.RegexOptions.Compiled);

    public string Value { get; }

    private TogetherID(string value) => Value = value;

    public static TogetherID Create(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new DomainValidationException(nameof(TogetherID), "Together ID cannot be empty.");

        var normalized = value.Trim().ToUpperInvariant();

        if (normalized.Length > MaxLength)
            throw new DomainValidationException(nameof(TogetherID), $"Together ID cannot exceed {MaxLength} characters.");

        if (!ValidPattern.IsMatch(normalized))
            throw new DomainValidationException(nameof(TogetherID),
                "Together ID must contain only uppercase letters, numbers, and hyphens, and must start/end with a letter or number.");

        return new TogetherID(normalized);
    }

    public override string ToString() => Value;

    public static implicit operator string(TogetherID id) => id.Value;
}
