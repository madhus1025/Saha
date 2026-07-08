using FluentAssertions;
using Saha.Application.Features.Messaging.Commands.CreateGroupConversation;
using Saha.Application.Features.Messaging.Commands.RenameConversation;
using Saha.Application.Features.Messaging.Commands.SendTextMessage;
using Xunit;

namespace Saha.Application.Tests.Features.Messaging;

public sealed class MessagingValidatorTests
{
    [Fact]
    public void CreateGroup_WithNoTargets_IsInvalid()
    {
        var result = new CreateGroupConversationValidator()
            .Validate(new CreateGroupConversationCommand("Name", Array.Empty<Guid>()));

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void CreateGroup_WithEmptyName_IsInvalid()
    {
        var result = new CreateGroupConversationValidator()
            .Validate(new CreateGroupConversationCommand("", new[] { Guid.NewGuid() }));

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void Rename_WithNameOver80_IsInvalid()
    {
        var result = new RenameConversationValidator()
            .Validate(new RenameConversationCommand(Guid.NewGuid(), new string('a', 81)));

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void SendText_WithEmptyBody_IsInvalid()
    {
        var result = new SendTextMessageValidator()
            .Validate(new SendTextMessageCommand(Guid.NewGuid(), ""));

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void SendText_WithValidBody_IsValid()
    {
        var result = new SendTextMessageValidator()
            .Validate(new SendTextMessageCommand(Guid.NewGuid(), "hello"));

        result.IsValid.Should().BeTrue();
    }
}
