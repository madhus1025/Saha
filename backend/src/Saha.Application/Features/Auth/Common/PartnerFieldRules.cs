using FluentValidation;

namespace Saha.Application.Features.Auth.Common;

/// <summary>
/// The half a partner fills in for themselves. Shared by registration and invitation acceptance so
/// the invitee is held to exactly the same rules as the registrant.
/// </summary>
public static class PartnerFieldRules
{
    public static IRuleBuilderOptions<T, string> PartnerUsername<T>(this IRuleBuilder<T, string> rule) =>
        rule
            .NotEmpty().WithMessage("Username is required.")
            .MaximumLength(30).WithMessage("Username cannot exceed 30 characters.")
            .Matches(@"^[a-z][a-z0-9_\.]{2,29}$")
                .WithMessage("Username must start with a letter and use only lowercase letters, numbers, dots, or underscores.");

    public static IRuleBuilderOptions<T, string> PartnerName<T>(this IRuleBuilder<T, string> rule) =>
        rule
            .NotEmpty().WithMessage("Your name is required.")
            .MaximumLength(100).WithMessage("Name cannot exceed 100 characters.");

    public static IRuleBuilderOptions<T, DateTime> PartnerDateOfBirth<T>(this IRuleBuilder<T, DateTime> rule) =>
        rule
            .NotEmpty().WithMessage("Date of birth is required.")
            .Must(dob => dob.Date <= DateTime.UtcNow.Date.AddYears(-16))
                .WithMessage("You need to be at least 16.")
            .Must(dob => dob.Date >= DateTime.UtcNow.Date.AddYears(-120))
                .WithMessage("That date of birth doesn't look right.");

    public static IRuleBuilderOptions<T, string> PartnerEmail<T>(this IRuleBuilder<T, string> rule) =>
        rule
            .NotEmpty().WithMessage("Email is required.")
            .EmailAddress().WithMessage("That email doesn't look right.")
            .MaximumLength(254);

    public static IRuleBuilderOptions<T, string> PartnerPhoneNumber<T>(this IRuleBuilder<T, string> rule) =>
        rule
            .NotEmpty().WithMessage("Phone number is required.")
            .Matches(@"^\+?[1-9]\d{6,14}$").WithMessage("Enter a valid international phone number.");
}
