using Saha.Domain.Exceptions;

namespace Saha.Domain.ValueObjects;

public sealed record PhoneNumber
{
    private static readonly System.Text.RegularExpressions.Regex ValidPattern =
        new(@"^\+?[1-9]\d{6,14}$", System.Text.RegularExpressions.RegexOptions.Compiled);

    public string Value { get; }

    private PhoneNumber(string value) => Value = value;

    public static PhoneNumber Create(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new DomainValidationException(nameof(PhoneNumber), "Phone number cannot be empty.");

        var normalized = value.Trim().Replace(" ", "").Replace("-", "").Replace("(", "").Replace(")", "");

        if (!ValidPattern.IsMatch(normalized))
            throw new DomainValidationException(nameof(PhoneNumber),
                "Phone number must be a valid international format (e.g., +91xxxxxxxxxx).");

        return new PhoneNumber(normalized);
    }

    public override string ToString() => Value;

    public static implicit operator string(PhoneNumber phone) => phone.Value;
}
