using FluentValidation;

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

        RuleFor(x => x.HusbandUsername)
            .NotEmpty().WithMessage("Husband username is required.")
            .MinimumLength(3).WithMessage("Husband username must be at least 3 characters.")
            .MaximumLength(30).WithMessage("Husband username cannot exceed 30 characters.")
            .Matches(@"^[a-z][a-z0-9_\.]{2,29}$")
            .WithMessage("Husband username must start with a letter and contain only lowercase letters, numbers, underscores, or dots.");

        RuleFor(x => x.HusbandName)
            .NotEmpty().WithMessage("Husband name is required.")
            .MaximumLength(100).WithMessage("Husband name cannot exceed 100 characters.");

        RuleFor(x => x.HusbandDateOfBirth)
            .NotEmpty().WithMessage("Husband date of birth is required.")
            .LessThan(DateTime.UtcNow.AddYears(-16)).WithMessage("Husband must be at least 16 years old.")
            .GreaterThan(DateTime.UtcNow.AddYears(-120)).WithMessage("Husband date of birth is not valid.");

        RuleFor(x => x.HusbandEmail)
            .NotEmpty().WithMessage("Husband email is required.")
            .EmailAddress().WithMessage("Husband email is not valid.")
            .MaximumLength(254).WithMessage("Husband email cannot exceed 254 characters.");

        RuleFor(x => x.HusbandPhoneNumber)
            .NotEmpty().WithMessage("Husband phone number is required.")
            .Matches(@"^\+?[1-9]\d{6,14}$").WithMessage("Husband phone number must be a valid international format.");

        RuleFor(x => x.WifeUsername)
            .NotEmpty().WithMessage("Wife username is required.")
            .MinimumLength(3).WithMessage("Wife username must be at least 3 characters.")
            .MaximumLength(30).WithMessage("Wife username cannot exceed 30 characters.")
            .Matches(@"^[a-z][a-z0-9_\.]{2,29}$")
            .WithMessage("Wife username must start with a letter and contain only lowercase letters, numbers, underscores, or dots.")
            .NotEqual(x => x.HusbandUsername).WithMessage("Wife and husband usernames must be different.");

        RuleFor(x => x.WifeName)
            .NotEmpty().WithMessage("Wife name is required.")
            .MaximumLength(100).WithMessage("Wife name cannot exceed 100 characters.");

        RuleFor(x => x.WifeDateOfBirth)
            .NotEmpty().WithMessage("Wife date of birth is required.")
            .LessThan(DateTime.UtcNow.AddYears(-16)).WithMessage("Wife must be at least 16 years old.")
            .GreaterThan(DateTime.UtcNow.AddYears(-120)).WithMessage("Wife date of birth is not valid.");

        RuleFor(x => x.WifeEmail)
            .NotEmpty().WithMessage("Wife email is required.")
            .EmailAddress().WithMessage("Wife email is not valid.")
            .MaximumLength(254).WithMessage("Wife email cannot exceed 254 characters.")
            .NotEqual(x => x.HusbandEmail).WithMessage("Wife and husband must have different email addresses.");

        RuleFor(x => x.WifePhoneNumber)
            .NotEmpty().WithMessage("Wife phone number is required.")
            .Matches(@"^\+?[1-9]\d{6,14}$").WithMessage("Wife phone number must be a valid international format.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Password is required.")
            .MinimumLength(8).WithMessage("Password must be at least 8 characters.")
            .MaximumLength(128).WithMessage("Password cannot exceed 128 characters.")
            .Matches(@"[A-Z]").WithMessage("Password must contain at least one uppercase letter.")
            .Matches(@"[a-z]").WithMessage("Password must contain at least one lowercase letter.")
            .Matches(@"[0-9]").WithMessage("Password must contain at least one digit.")
            .Matches(@"[^a-zA-Z0-9]").WithMessage("Password must contain at least one special character.");

        RuleFor(x => x.ConfirmPassword)
            .Equal(x => x.Password).WithMessage("Passwords do not match.");
    }
}
