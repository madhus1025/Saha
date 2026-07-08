using FluentValidation;
using Saha.Domain.ValueObjects;

namespace Saha.Application.Features.Messaging.Commands.CreateGroupConversation;

public sealed class CreateGroupConversationValidator : AbstractValidator<CreateGroupConversationCommand>
{
    public CreateGroupConversationValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Conversation name is required.")
            .MaximumLength(ConversationName.MaxLength)
            .WithMessage($"Conversation name cannot exceed {ConversationName.MaxLength} characters.");

        RuleFor(x => x.TargetCoupleIds)
            .NotNull().WithMessage("At least one other couple is required.")
            .Must(ids => ids is { Count: >= 1 }).WithMessage("At least one other couple is required.");

        RuleForEach(x => x.TargetCoupleIds)
            .NotEqual(Guid.Empty).WithMessage("Target couple id is invalid.");
    }
}
