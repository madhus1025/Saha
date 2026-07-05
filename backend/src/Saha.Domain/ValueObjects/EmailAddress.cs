using Saha.Domain.Exceptions;

namespace Saha.Domain.ValueObjects;

public sealed record EmailAddress
{
    private const int MaxLength = 254;
    private static readonly System.Text.RegularExpressions.Regex ValidPattern =
        new(@"^[^@\s]+@[^@\s]+\.[^@\s]+$", System.Text.RegularExpressions.RegexOptions.Compiled | System.Text.RegularExpressions.RegexOptions.IgnoreCase);

    public string Value { get; }

    private EmailAddress(string value) => Value = value;

    public static EmailAddress Create(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new DomainValidationException(nameof(EmailAddress), "Email address cannot be empty.");

        var normalized = value.Trim().ToLowerInvariant();

        if (normalized.Length > MaxLength)
            throw new DomainValidationException(nameof(EmailAddress), "Email address is too long.");

        if (!ValidPattern.IsMatch(normalized))
            throw new DomainValidationException(nameof(EmailAddress), "Email address is not valid.");

        return new EmailAddress(normalized);
    }

    public override string ToString() => Value;

    public static implicit operator string(EmailAddress email) => email.Value;
}
