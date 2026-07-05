using FluentValidation;

namespace Saha.Application.Features.Auth.Commands.ForgotPassword;

public sealed class ForgotPasswordCommandValidator : AbstractValidator<ForgotPasswordCommand>
{
    public ForgotPasswordCommandValidator()
    {
        RuleFor(x => x.TogetherIDOrUsername)
            .NotEmpty().WithMessage("Together ID or username is required.")
            .MaximumLength(50).WithMessage("Input cannot exceed 50 characters.");
    }
}
