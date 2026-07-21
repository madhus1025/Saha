using FluentValidation;
using Saha.Application.Features.Auth.Common;

namespace Saha.Application.Features.Auth.Commands.Register;

public sealed class RegisterCoupleCommandValidator : AbstractValidator<RegisterCoupleCommand>
{
    public RegisterCoupleCommandValidator()
    {
        RuleFor(x => x.TogetherID)
            .NotEmpty().WithMessage("Together ID is required.")
            .MaximumLength(50).WithMessage("Together ID cannot exceed 50 characters.")
            .Matches(@"^[A-Z0-9][A-Z0-9\-]{2,48}[A-Z0-9]$")
                .WithMessage("Together ID must contain only uppercase letters, numbers, and hyphens.");

        RuleFor(x => x.Username).PartnerUsername();
        RuleFor(x => x.Name).PartnerName();
        RuleFor(x => x.DateOfBirth).PartnerDateOfBirth();
        RuleFor(x => x.Email).PartnerEmail();
        RuleFor(x => x.PhoneNumber).PartnerPhoneNumber();

        RuleFor(x => x.Role)
            .IsInEnum().WithMessage("Choose whether you're the wife or the husband.");

        RuleFor(x => x.Password).SharedPassword();

        RuleFor(x => x.ConfirmPassword)
            .Equal(x => x.Password).WithMessage("Those don't match yet.");
    }
}
