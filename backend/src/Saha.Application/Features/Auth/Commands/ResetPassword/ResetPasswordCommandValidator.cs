using FluentValidation;
using Saha.Application.Features.Auth.Common;

namespace Saha.Application.Features.Auth.Commands.ResetPassword;

public sealed class ResetPasswordCommandValidator : AbstractValidator<ResetPasswordCommand>
{
    public ResetPasswordCommandValidator()
    {
        RuleFor(x => x.TogetherIDOrUsername)
            .NotEmpty().WithMessage("Together ID or username is required.");

        RuleFor(x => x.Code)
            .NotEmpty().WithMessage("Verification code is required.")
            .Length(6).WithMessage("Verification code must be exactly 6 digits.")
            // `\d` matches every Unicode decimal digit in .NET, so Arabic-Indic digits such as
            // ١٢٣٤٥٦ cleared validation and reached the token lookup. Codes are ASCII.
            .Matches(@"^[0-9]{6}$").WithMessage("Verification code must contain only digits.");

        // Reset shares registration's policy — one rule, defined once, in PasswordRules.
        RuleFor(x => x.NewPassword).SharedPassword();

        RuleFor(x => x.ConfirmPassword)
            .Equal(x => x.NewPassword).WithMessage("Passwords do not match.");
    }
}
