using FluentAssertions;
using Saha.Domain.Entities;
using Saha.Domain.Enums;
using Saha.Domain.Events;
using Saha.Domain.Exceptions;
using Xunit;

namespace Saha.Domain.Tests.Entities;

public sealed class MessageTests
{
    private static readonly Guid ConversationId = Guid.NewGuid();
    private static readonly Guid Sender = Guid.NewGuid();
    private static readonly Guid SenderCouple = Guid.NewGuid();
    private static readonly Guid OtherPartner = Guid.NewGuid();
    private static readonly Guid OtherCouple = Guid.NewGuid();

    private static Message Text(string body = "hello") =>
        Message.CreateText(ConversationId, Sender, SenderCouple, body);

    // FR-13
    [Fact]
    public void CreateText_SetsFieldsAndRaisesEvent()
    {
        var msg = Text();

        msg.ContentType.Should().Be(MessageContentType.Text);
        msg.Body.Should().Be("hello");
        msg.SenderPartnerId.Should().Be(Sender);
        msg.IsDeleted.Should().BeFalse();
        msg.IsEdited.Should().BeFalse();
        msg.DomainEvents.Should().ContainSingle(e => e is MessageSentEvent);
    }

    [Fact]
    public void CreateText_WithEmptyBody_Throws()
    {
        var act = () => Message.CreateText(ConversationId, Sender, SenderCouple, "   ");

        act.Should().Throw<DomainException>().Which.Code.Should().Be("INVALID_MESSAGE_BODY");
    }

    [Fact]
    public void CreateText_WithBodyOver4000_Throws()
    {
        var act = () => Message.CreateText(ConversationId, Sender, SenderCouple, new string('a', 4001));

        act.Should().Throw<DomainException>();
    }

    // FR-14 / FR-15
    [Fact]
    public void CreateMedia_SetsAttachmentAndType()
    {
        var attachment = MessageAttachment.Create("https://blob/x.png", "image/png", "x.png", 1234);
        var msg = Message.CreateMedia(ConversationId, Sender, SenderCouple, MessageContentType.Image, "cap", attachment);

        msg.ContentType.Should().Be(MessageContentType.Image);
        msg.Attachment.Should().NotBeNull();
        msg.Attachment!.Url.Should().Be("https://blob/x.png");
        msg.Body.Should().Be("cap");
    }

    [Fact]
    public void CreateMedia_WithTextType_Throws()
    {
        var attachment = MessageAttachment.Create("https://blob/x.png", "image/png", "x.png", 1234);

        var act = () => Message.CreateMedia(ConversationId, Sender, SenderCouple, MessageContentType.Text, null, attachment);

        act.Should().Throw<DomainException>();
    }

    // FR-17
    [Fact]
    public void Edit_BySender_SetsEditedMarker()
    {
        var msg = Text();

        msg.Edit(Sender, "updated");

        msg.Body.Should().Be("updated");
        msg.IsEdited.Should().BeTrue();
        msg.EditedAt.Should().NotBeNull();
        msg.DomainEvents.Should().Contain(e => e is MessageEditedEvent);
    }

    // FR-19
    [Fact]
    public void Edit_ByNonSender_Throws()
    {
        var msg = Text();

        var act = () => msg.Edit(OtherPartner, "updated");

        act.Should().Throw<DomainException>().Which.Code.Should().Be("NOT_MESSAGE_SENDER");
    }

    [Fact]
    public void Edit_WhenDeleted_Throws()
    {
        var msg = Text();
        msg.Delete(Sender);

        var act = () => msg.Edit(Sender, "updated");

        act.Should().Throw<DomainException>();
    }

    // FR-18 / D5
    [Fact]
    public void Delete_BySender_TombstonesAndClearsContentAndReactions()
    {
        var attachment = MessageAttachment.Create("https://blob/x.png", "image/png", "x.png", 1234);
        var msg = Message.CreateMedia(ConversationId, Sender, SenderCouple, MessageContentType.Image, "cap", attachment);
        msg.React(OtherPartner, OtherCouple, "heart");

        msg.Delete(Sender);

        msg.IsDeleted.Should().BeTrue();
        msg.DeletedAt.Should().NotBeNull();
        msg.Body.Should().BeNull();
        msg.Attachment.Should().BeNull();
        msg.Reactions.Should().BeEmpty();
        msg.DomainEvents.Should().Contain(e => e is MessageDeletedEvent);
    }

    [Fact]
    public void Delete_ByNonSender_Throws()
    {
        var msg = Text();

        var act = () => msg.Delete(OtherPartner);

        act.Should().Throw<DomainException>().Which.Code.Should().Be("NOT_MESSAGE_SENDER");
    }

    // FR-21 / FR-24
    [Fact]
    public void React_AddsSingleReaction()
    {
        var msg = Text();

        msg.React(OtherPartner, OtherCouple, "heart");

        msg.Reactions.Should().ContainSingle();
        msg.Reactions[0].PartnerId.Should().Be(OtherPartner);
        msg.Reactions[0].Emoji.Should().Be("heart");
        msg.DomainEvents.Should().Contain(e => e is MessageReactionChangedEvent);
    }

    // FR-22
    [Fact]
    public void React_Twice_ReplacesReaction()
    {
        var msg = Text();

        msg.React(OtherPartner, OtherCouple, "heart");
        msg.React(OtherPartner, OtherCouple, "fire");

        msg.Reactions.Should().ContainSingle();
        msg.Reactions[0].Emoji.Should().Be("fire");
    }

    [Fact]
    public void React_WithInvalidEmoji_Throws()
    {
        var msg = Text();

        var act = () => msg.React(OtherPartner, OtherCouple, "poop");

        act.Should().Throw<DomainValidationException>();
    }

    // FR-23
    [Fact]
    public void RemoveReaction_RemovesCallersReaction()
    {
        var msg = Text();
        msg.React(OtherPartner, OtherCouple, "heart");

        msg.RemoveReaction(OtherPartner);

        msg.Reactions.Should().BeEmpty();
    }
}
