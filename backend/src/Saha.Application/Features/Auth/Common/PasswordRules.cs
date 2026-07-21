using System.Text;
using FluentValidation;

namespace Saha.Application.Features.Auth.Common;

/// <summary>
/// The single shared-password policy for the couple, applied identically wherever a password is
/// set — registration and password reset. Keeping one rule in one place is the point: the two paths
/// previously disagreed, so a password legal at sign-up could be refused at reset (SAHA-D01).
///
/// Composition rules are required (upper, lower, digit, special). The upper bound is expressed in
/// <em>bytes</em>, not characters, because BCrypt silently truncates its input at 72 bytes —
/// anything past that would be ignored, so two passwords sharing a 72-byte prefix would both
/// verify. Rejecting is the only honest option; silently storing a shorter password is not.
/// </summary>
public static class PasswordRules
{
    public const int MinLength = 8;
    public const int MaxBytes = 72;

    public static int ByteLength(string password) => Encoding.UTF8.GetByteCount(password);

    public static IRuleBuilderOptions<T, string> SharedPassword<T>(this IRuleBuilder<T, string> rule) =>
        rule
            .NotEmpty().WithMessage("Choose a password you'd both remember.")
            .MinimumLength(MinLength)
                .WithMessage($"A little longer — at least {MinLength} characters.")
            .Must(p => p is null || ByteLength(p) <= MaxBytes)
                .WithMessage($"That's longer than we can keep safe. Please use at most {MaxBytes} bytes.")
            .Matches("[A-Z]").WithMessage("Add at least one uppercase letter.")
            .Matches("[a-z]").WithMessage("Add at least one lowercase letter.")
            .Matches("[0-9]").WithMessage("Add at least one number.")
            .Matches("[^a-zA-Z0-9]").WithMessage("Add at least one special character.");
}
