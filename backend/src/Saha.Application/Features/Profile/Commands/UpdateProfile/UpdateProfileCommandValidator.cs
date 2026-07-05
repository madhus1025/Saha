using FluentValidation;

namespace Saha.Application.Features.Profile.Commands.UpdateProfile;

public sealed class UpdateProfileCommandValidator : AbstractValidator<UpdateProfileCommand>
{
    public UpdateProfileCommandValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Name is required.")
            .MaximumLength(100).WithMessage("Name cannot exceed 100 characters.");

        RuleFor(x => x.DateOfBirth)
            .NotEmpty().WithMessage("Date of birth is required.")
            .LessThan(DateTime.UtcNow.AddYears(-16)).WithMessage("You must be at least 16 years old.")
            .GreaterThan(DateTime.UtcNow.AddYears(-120)).WithMessage("Date of birth is not valid.");

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required.")
            .EmailAddress().WithMessage("Email is not valid.")
            .MaximumLength(254).WithMessage("Email cannot exceed 254 characters.");

        RuleFor(x => x.PhoneNumber)
            .NotEmpty().WithMessage("Phone number is required.")
            .Matches(@"^\+?[1-9]\d{6,14}$").WithMessage("Phone number must be a valid international format.");
    }
}
