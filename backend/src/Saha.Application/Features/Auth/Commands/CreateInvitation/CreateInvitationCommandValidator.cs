using FluentValidation;

namespace Saha.Application.Features.Auth.Commands.CreateInvitation;

public sealed class CreateInvitationCommandValidator : AbstractValidator<CreateInvitationCommand>
{
    public CreateInvitationCommandValidator()
    {
        RuleFor(x => x.InviteeName)
            .NotEmpty().WithMessage("Their name is required.")
            .MaximumLength(100).WithMessage("Name cannot exceed 100 characters.");

        RuleFor(x => x.InviteeEmail)
            .NotEmpty().WithMessage("Their email is required.")
            .EmailAddress().WithMessage("That email doesn't look right.")
            .MaximumLength(254);
    }
}
