using FluentAssertions;
using Saha.Domain.Entities;
using Saha.Domain.Enums;
using Saha.Infrastructure.Persistence.Repositories;
using Xunit;

namespace Saha.Infrastructure.Tests.Persistence.Repositories;

public sealed class MessageRepositoryTests : IDisposable
{
    private readonly MessagingDbContextFactory _factory = new();
    private readonly MessageRepository _repository;

    private static readonly Guid ConversationId = Guid.NewGuid();
    private static readonly Guid SenderCouple = Guid.NewGuid();
    private static readonly Guid SenderPartner = Guid.NewGuid();
    private static readonly Guid OtherPartner = Guid.NewGuid();
    private static readonly Guid OtherCouple = Guid.NewGuid();

    public MessageRepositoryTests() => _repository = new MessageRepository(_factory.Context);

    [Fact]
    public async Task GetByIdAsync_ShouldIncludeAttachmentAndReactions()
    {
        var attachment = MessageAttachment.Create("https://blob/photo.jpg", "image/jpeg", "photo.jpg", 1234);
        var message = Message.CreateMedia(
            ConversationId, SenderPartner, SenderCouple, MessageContentType.Image, "a caption", attachment);
        message.React(OtherPartner, OtherCouple, "heart");
        await _repository.AddAsync(message);

        var found = await _repository.GetByIdAsync(message.Id);

        found.Should().NotBeNull();
        found!.Attachment.Should().NotBeNull();
        found.Attachment!.Url.Should().Be("https://blob/photo.jpg");
        found.Reactions.Should().ContainSingle().Which.Emoji.Should().Be("heart");
    }

    [Fact]
    public async Task GetPageAsync_ShouldReturnMessagesNewestFirst()
    {
        var first = await AddTextAsync("one");
        var second = await AddTextAsync("two");
        var third = await AddTextAsync("three");

        var page = await _repository.GetPageAsync(ConversationId, beforeTicks: null, beforeId: null, take: 30);

        page.Select(m => m.Id).Should().ContainInOrder(third.Id, second.Id, first.Id);
    }

    [Fact]
    public async Task GetPageAsync_ShouldRespectTakeLimit()
    {
        await AddTextAsync("one");
        await AddTextAsync("two");
        await AddTextAsync("three");

        var page = await _repository.GetPageAsync(ConversationId, beforeTicks: null, beforeId: null, take: 2);

        page.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetPageAsync_WithBeforeCursor_ShouldReturnOnlyOlderMessages()
    {
        var first = await AddTextAsync("one");
        var second = await AddTextAsync("two");
        var third = await AddTextAsync("three");

        // Page after the newest: everything strictly older than `third`.
        var page = await _repository.GetPageAsync(
            ConversationId, beforeTicks: third.CreatedAt.Ticks, beforeId: third.Id, take: 30);

        page.Select(m => m.Id).Should().ContainInOrder(second.Id, first.Id);
        page.Should().NotContain(m => m.Id == third.Id);
    }

    [Fact]
    public async Task GetPageAsync_ShouldScopeToConversation()
    {
        await AddTextAsync("in scope");
        var other = Message.CreateText(Guid.NewGuid(), SenderPartner, SenderCouple, "other conversation");
        await _repository.AddAsync(other);

        var page = await _repository.GetPageAsync(ConversationId, beforeTicks: null, beforeId: null, take: 30);

        page.Should().ContainSingle().Which.Body.Should().Be("in scope");
    }

    [Fact]
    public async Task React_ChangingReaction_ShouldPersistSingleRowWithNewEmoji()
    {
        var message = await AddTextAsync("hello");

        message.React(SenderPartner, SenderCouple, "heart");
        await _repository.UpdateAsync(message);
        message.React(SenderPartner, SenderCouple, "laugh");
        await _repository.UpdateAsync(message);

        var reloaded = await _repository.GetByIdAsync(message.Id);
        reloaded!.Reactions.Should().ContainSingle()
            .Which.Emoji.Should().Be("laugh"); // one-per-person upsert (FR-21/FR-22)
    }

    [Fact]
    public async Task React_DifferentPartners_ShouldPersistSeparateRows()
    {
        var message = await AddTextAsync("hello");

        message.React(SenderPartner, SenderCouple, "heart");
        message.React(OtherPartner, OtherCouple, "fire");
        await _repository.UpdateAsync(message);

        var reloaded = await _repository.GetByIdAsync(message.Id);
        reloaded!.Reactions.Should().HaveCount(2);
        reloaded.Reactions.Select(r => r.PartnerId).Should().BeEquivalentTo(new[] { SenderPartner, OtherPartner });
    }

    private async Task<Message> AddTextAsync(string body)
    {
        var message = Message.CreateText(ConversationId, SenderPartner, SenderCouple, body);
        await _repository.AddAsync(message);
        await Task.Delay(5); // guarantee distinct CreatedAt for deterministic ordering
        return message;
    }

    public void Dispose() => _factory.Dispose();
}
