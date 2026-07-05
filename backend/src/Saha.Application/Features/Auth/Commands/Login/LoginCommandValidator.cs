using FluentValidation;

namespace Saha.Application.Features.Auth.Commands.Login;

public sealed class LoginCommandValidator : AbstractValidator<LoginCommand>
{
    public LoginCommandValidator()
    {
        RuleFor(x => x.Username)
            .NotEmpty().WithMessage("Username is required.")
            .MaximumLength(30).WithMessage("Username cannot exceed 30 characters.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Password is required.")
            .MaximumLength(128).WithMessage("Password cannot exceed 128 characters.");
    }
}
