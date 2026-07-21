using System.Text;
using FluentValidation;

namespace Saha.Application.Features.Auth.Common;

/// <summary>
/// One shared passphrase per couple. There are no character-class rules: a long phrase two people
/// both remember beats a mandated symbol. The upper bound is in <em>bytes</em>, not characters,
/// because BCrypt silently truncates its input at 72 bytes — anything past that would be ignored,
/// so two passphrases sharing a 72-byte prefix would both verify.
/// </summary>
public static class PasswordRules
{
    public const int MinLength = 12;
    public const int MaxBytes = 72;

    public static int ByteLength(string password) => Encoding.UTF8.GetByteCount(password);

    public static IRuleBuilderOptions<T, string> SharedPassword<T>(this IRuleBuilder<T, string> rule) =>
        rule
            .NotEmpty().WithMessage("Choose a password you'd both remember.")
            .MinimumLength(MinLength)
                .WithMessage($"A little longer — at least {MinLength} characters.")
            .Must(p => p is null || ByteLength(p) <= MaxBytes)
                .WithMessage($"That's longer than we can keep safe. Please use at most {MaxBytes} bytes.");
}
