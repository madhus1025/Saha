using FluentValidation;
using Saha.Domain.Entities;

namespace Saha.Application.Features.Messaging.Commands.SendTextMessage;

public sealed class SendTextMessageValidator : AbstractValidator<SendTextMessageCommand>
{
    public SendTextMessageValidator()
    {
        RuleFor(x => x.Body)
            .NotEmpty().WithMessage("Message body is required.")
            .MaximumLength(Message.MaxBodyLength)
            .WithMessage($"Message body cannot exceed {Message.MaxBodyLength} characters.");
    }
}
