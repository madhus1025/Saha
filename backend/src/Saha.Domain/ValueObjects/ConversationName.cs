using Saha.Domain.Exceptions;

namespace Saha.Domain.ValueObjects;

public sealed record ConversationName
{
    public const int MaxLength = 80;

    public string Value { get; }

    private ConversationName(string value) => Value = value;

    public static ConversationName Create(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new DomainValidationException(nameof(ConversationName), "Conversation name cannot be empty.");

        var trimmed = value.Trim();

        if (trimmed.Length > MaxLength)
            throw new DomainValidationException(nameof(ConversationName),
                $"Conversation name cannot exceed {MaxLength} characters.");

        return new ConversationName(trimmed);
    }

    public override string ToString() => Value;

    public static implicit operator string(ConversationName name) => name.Value;
}
