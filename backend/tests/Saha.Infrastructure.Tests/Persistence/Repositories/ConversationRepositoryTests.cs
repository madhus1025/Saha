using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Saha.Domain.Entities;
using Saha.Domain.Enums;
using Saha.Infrastructure.Persistence.Repositories;
using Xunit;

namespace Saha.Infrastructure.Tests.Persistence.Repositories;

public sealed class ConversationRepositoryTests : IDisposable
{
    private readonly MessagingDbContextFactory _factory = new();
    private readonly ConversationRepository _repository;

    // Three couples, each with two partners.
    private static readonly Guid CoupleA = Guid.NewGuid();
    private static readonly Guid CoupleAH = Guid.NewGuid();
    private static readonly Guid CoupleAW = Guid.NewGuid();
    private static readonly Guid CoupleB = Guid.NewGuid();
    private static readonly Guid CoupleBH = Guid.NewGuid();
    private static readonly Guid CoupleBW = Guid.NewGuid();
    private static readonly Guid CoupleC = Guid.NewGuid();
    private static readonly Guid CoupleCH = Guid.NewGuid();
    private static readonly Guid CoupleCW = Guid.NewGuid();

    public ConversationRepositoryTests() => _repository = new ConversationRepository(_factory.Context);

    [Fact]
    public async Task GetByIdAsync_ShouldIncludeParticipantsAndCoupleStates()
    {
        var group = GroupOf(CoupleA, CoupleB);
        await _repository.AddAsync(group);

        var found = await _repository.GetByIdAsync(group.Id);

        found.Should().NotBeNull();
        found!.Participants.Should().HaveCount(4); // two partners per couple
        found.CoupleStates.Should().HaveCount(2);  // one per couple
    }

    [Fact]
    public async Task GetListForCoupleAsync_ShouldReturnPartnerConversationFirst()
    {
        await _repository.AddAsync(Conversation.CreatePartner(CoupleA, CoupleAH, CoupleAW));
        await _repository.AddAsync(GroupOf(CoupleA, CoupleB));

        var list = await _repository.GetListForCoupleAsync(CoupleA);

        list.Should().HaveCount(2);
        list[0].Type.Should().Be(ConversationType.Partner);
    }

    [Fact]
    public async Task GetListForCoupleAsync_ShouldOrderNonPartnerByLastActivityDescending()
    {
        var older = GroupOf(CoupleA, CoupleB);
        await _repository.AddAsync(older);
        await Task.Delay(5);
        var newer = GroupOf(CoupleA, CoupleC);
        await _repository.AddAsync(newer);

        // Bump the older group so it becomes the most recent.
        older.TouchActivity("hi", CoupleAH);
        await _repository.UpdateAsync(older);

        var list = await _repository.GetListForCoupleAsync(CoupleA);

        list.Should().HaveCount(2);
        list[0].Id.Should().Be(older.Id);
        list[1].Id.Should().Be(newer.Id);
    }

    [Fact]
    public async Task GetListForCoupleAsync_ShouldExcludeHiddenConversations()
    {
        await _repository.AddAsync(Conversation.CreatePartner(CoupleA, CoupleAH, CoupleAW));
        var group = GroupOf(CoupleA, CoupleB);
        await _repository.AddAsync(group);

        group.HideForCouple(CoupleA);
        await _repository.UpdateAsync(group);

        var list = await _repository.GetListForCoupleAsync(CoupleA);

        list.Should().ContainSingle().Which.Type.Should().Be(ConversationType.Partner);
    }

    [Fact]
    public async Task GetListForCoupleAsync_ShouldNotLeakConversationsOfOtherCouples()
    {
        // A group between B and C only; couple A must not see it (couple isolation, FR-25).
        await _repository.AddAsync(GroupOf(CoupleB, CoupleC));

        var list = await _repository.GetListForCoupleAsync(CoupleA);

        list.Should().BeEmpty();
    }

    [Fact]
    public async Task GetListForCoupleAsync_ShouldStillReturnConversationHiddenByAnotherCouple()
    {
        // FR-12: hide affects only the acting couple's copy.
        var group = GroupOf(CoupleA, CoupleB);
        await _repository.AddAsync(group);

        group.HideForCouple(CoupleB);
        await _repository.UpdateAsync(group);

        var listA = await _repository.GetListForCoupleAsync(CoupleA);
        var listB = await _repository.GetListForCoupleAsync(CoupleB);

        listA.Should().ContainSingle();
        listB.Should().BeEmpty();
    }

    [Fact]
    public async Task PartnerConversationExistsAsync_ShouldReturnTrue_WhenExists()
    {
        await _repository.AddAsync(Conversation.CreatePartner(CoupleA, CoupleAH, CoupleAW));

        (await _repository.PartnerConversationExistsAsync(CoupleA)).Should().BeTrue();
    }

    [Fact]
    public async Task PartnerConversationExistsAsync_ShouldReturnFalse_WhenNone()
    {
        (await _repository.PartnerConversationExistsAsync(CoupleA)).Should().BeFalse();
    }

    [Fact]
    public async Task PartnerConversationUniqueIndex_ShouldRejectSecondPartnerConversationForSameCouple()
    {
        await _repository.AddAsync(Conversation.CreatePartner(CoupleA, CoupleAH, CoupleAW));

        var duplicate = Conversation.CreatePartner(CoupleA, CoupleAH, CoupleAW);

        var act = async () => await _repository.AddAsync(duplicate);

        await act.Should().ThrowAsync<DbUpdateException>();
    }

    private static Conversation GroupOf(Guid coupleX, Guid coupleY)
    {
        var members = new List<(Guid, Guid, Guid)>
        {
            (coupleX, PartnerHusband(coupleX), PartnerWife(coupleX)),
            (coupleY, PartnerHusband(coupleY), PartnerWife(coupleY)),
        };
        return Conversation.CreateGroup(coupleX, members, "Weekend Trip");
    }

    private static Guid PartnerHusband(Guid couple) =>
        couple == CoupleA ? CoupleAH : couple == CoupleB ? CoupleBH : CoupleCH;

    private static Guid PartnerWife(Guid couple) =>
        couple == CoupleA ? CoupleAW : couple == CoupleB ? CoupleBW : CoupleCW;

    public void Dispose() => _factory.Dispose();
}
