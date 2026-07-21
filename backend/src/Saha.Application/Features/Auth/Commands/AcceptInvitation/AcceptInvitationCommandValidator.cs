using FluentValidation;
using Saha.Application.Features.Auth.Common;

namespace Saha.Application.Features.Auth.Commands.AcceptInvitation;

public sealed class AcceptInvitationCommandValidator : AbstractValidator<AcceptInvitationCommand>
{
    public AcceptInvitationCommandValidator()
    {
        RuleFor(x => x.Token).NotEmpty().WithMessage("Invitation token is required.");

        RuleFor(x => x.Username).PartnerUsername();
        RuleFor(x => x.Name).PartnerName();
        RuleFor(x => x.DateOfBirth).PartnerDateOfBirth();
        RuleFor(x => x.Email).PartnerEmail();
        RuleFor(x => x.PhoneNumber).PartnerPhoneNumber();
    }
}
