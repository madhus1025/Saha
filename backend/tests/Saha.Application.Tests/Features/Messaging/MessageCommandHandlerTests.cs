using FluentAssertions;
using Microsoft.Extensions.Configuration;
using NSubstitute;
using Saha.Application.Common.Exceptions;
using Saha.Application.Common.Interfaces;
using Saha.Application.Features.Messaging.Commands.DeleteMessage;
using Saha.Application.Features.Messaging.Commands.ReactToMessage;
using Saha.Domain.Entities;
using Saha.Domain.Enums;
using Saha.Domain.Exceptions;
using Saha.Domain.Interfaces.Repositories;
using Xunit;

namespace Saha.Application.Tests.Features.Messaging;

public sealed class MessageCommandHandlerTests
{
    private readonly IConversationRepository _conversations = Substitute.For<IConversationRepository>();
    private readonly IMessageRepository _messages = Substitute.For<IMessageRepository>();
    private readonly IBlobStorageService _blob = Substitute.For<IBlobStorageService>();
    private readonly IAuditLogger _audit = Substitute.For<IAuditLogger>();
    private readonly IConfiguration _config = Substitute.For<IConfiguration>();
    private readonly ICurrentUserContext _currentUser = Substitute.For<ICurrentUserContext>();

    private readonly Couple _owner = MessagingTestData.MakeCouple("MSG-OWNER");
    private readonly Couple _member = MessagingTestData.MakeCouple("MSG-MEMBER");
    private readonly Couple _outsider = MessagingTestData.MakeCouple("MSG-OUTSIDER");
    private readonly Conversation _group;

    public MessageCommandHandlerTests()
    {
        _group = MessagingTestData.MakeGroup(_owner, _member);
        _conversations.GetByIdAsync(_group.Id, Arg.Any<CancellationToken>()).Returns(_group);
        _config[Arg.Any<string>()].Returns((string?)null);
    }

    private void ActAs(Couple couple, Guid partnerId)
    {
        _currentUser.CoupleId.Returns(couple.Id);
        _currentUser.PartnerId.Returns(partnerId);
    }

    private Message SenderMessage(string body = "hi")
    {
        var msg = Message.CreateText(_group.Id, _owner.Husband.Id, _owner.Id, body);
        _messages.GetByIdAsync(msg.Id, Arg.Any<CancellationToken>()).Returns(msg);
        return msg;
    }

    private DeleteMessageCommandHandler DeleteHandler() =>
        new(_conversations, _messages, _blob, _audit, _currentUser, _config);

    private ReactToMessageCommandHandler ReactHandler() =>
        new(_conversations, _messages, _currentUser);

    // FR-19 — non-sender delete → 403
    [Fact]
    public async Task Delete_ByNonSender_ThrowsForbidden()
    {
        var msg = SenderMessage();
        ActAs(_member, _member.Husband.Id);

        var act = () => DeleteHandler().Handle(new DeleteMessageCommand(_group.Id, msg.Id), CancellationToken.None);

        await act.Should().ThrowAsync<ForbiddenException>();
    }

    // FR-18 / D5 — sender delete tombstones + best-effort blob cleanup
    [Fact]
    public async Task Delete_BySender_TombstonesAndDeletesBlob()
    {
        var attachment = MessageAttachment.Create("https://blob/x.png", "image/png", "x.png", 10);
        var msg = Message.CreateMedia(_group.Id, _owner.Husband.Id, _owner.Id, MessageContentType.Image, null, attachment);
        _messages.GetByIdAsync(msg.Id, Arg.Any<CancellationToken>()).Returns(msg);
        ActAs(_owner, _owner.Husband.Id);

        await DeleteHandler().Handle(new DeleteMessageCommand(_group.Id, msg.Id), CancellationToken.None);

        msg.IsDeleted.Should().BeTrue();
        msg.Attachment.Should().BeNull();
        await _blob.Received(1).DeleteAsync("https://blob/x.png", Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    // FR-25 — isolation: non-participant reacting → 404
    [Fact]
    public async Task React_ByNonParticipant_ThrowsNotFound()
    {
        var msg = SenderMessage();
        ActAs(_outsider, _outsider.Husband.Id);

        var act = () => ReactHandler().Handle(
            new ReactToMessageCommand(_group.Id, msg.Id, "heart"), CancellationToken.None);

        await act.Should().ThrowAsync<NotFoundException>();
    }

    // FR-21 — react persists a single reaction
    [Fact]
    public async Task React_ByParticipant_AddsReaction()
    {
        var msg = SenderMessage();
        ActAs(_member, _member.Wife.Id);

        await ReactHandler().Handle(new ReactToMessageCommand(_group.Id, msg.Id, "heart"), CancellationToken.None);

        msg.Reactions.Should().ContainSingle(r => r.PartnerId == _member.Wife.Id && r.Emoji == "heart");
        await _messages.Received(1).UpdateAsync(msg, Arg.Any<CancellationToken>());
    }

    // A4 — invalid emoji rejected
    [Fact]
    public async Task React_WithInvalidEmoji_Throws()
    {
        var msg = SenderMessage();
        ActAs(_member, _member.Wife.Id);

        var act = () => ReactHandler().Handle(
            new ReactToMessageCommand(_group.Id, msg.Id, "poop"), CancellationToken.None);

        await act.Should().ThrowAsync<DomainValidationException>();
    }
}
