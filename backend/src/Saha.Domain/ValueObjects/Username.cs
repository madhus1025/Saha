using Saha.Domain.Exceptions;

namespace Saha.Domain.ValueObjects;

public sealed record Username
{
    private const int MinLength = 3;
    private const int MaxLength = 30;
    private static readonly System.Text.RegularExpressions.Regex ValidPattern =
        new(@"^[a-z][a-z0-9_\.]{2,29}$", System.Text.RegularExpressions.RegexOptions.Compiled);

    public string Value { get; }

    private Username(string value) => Value = value;

    public static Username Create(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new DomainValidationException(nameof(Username), "Username cannot be empty.");

        var normalized = value.Trim().ToLowerInvariant();

        if (normalized.Length < MinLength || normalized.Length > MaxLength)
            throw new DomainValidationException(nameof(Username),
                $"Username must be between {MinLength} and {MaxLength} characters.");

        if (!ValidPattern.IsMatch(normalized))
            throw new DomainValidationException(nameof(Username),
                "Username must start with a letter and contain only lowercase letters, numbers, underscores, or dots.");

        return new Username(normalized);
    }

    public override string ToString() => Value;

    public static implicit operator string(Username username) => username.Value;
}
