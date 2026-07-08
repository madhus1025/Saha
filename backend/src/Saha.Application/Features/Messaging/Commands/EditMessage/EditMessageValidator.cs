using FluentValidation;
using Saha.Domain.Entities;

namespace Saha.Application.Features.Messaging.Commands.EditMessage;

public sealed class EditMessageValidator : AbstractValidator<EditMessageCommand>
{
    public EditMessageValidator()
    {
        RuleFor(x => x.Body)
            .NotEmpty().WithMessage("Message body is required.")
            .MaximumLength(Message.MaxBodyLength)
            .WithMessage($"Message body cannot exceed {Message.MaxBodyLength} characters.");
    }
}
