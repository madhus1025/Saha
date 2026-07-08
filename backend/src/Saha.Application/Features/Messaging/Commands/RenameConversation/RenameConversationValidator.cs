using FluentValidation;
using Saha.Domain.ValueObjects;

namespace Saha.Application.Features.Messaging.Commands.RenameConversation;

public sealed class RenameConversationValidator : AbstractValidator<RenameConversationCommand>
{
    public RenameConversationValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Conversation name is required.")
            .MaximumLength(ConversationName.MaxLength)
            .WithMessage($"Conversation name cannot exceed {ConversationName.MaxLength} characters.");
    }
}
