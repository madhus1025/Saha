using FluentAssertions;
using Saha.Domain.Entities;
using Saha.Domain.Enums;
using Saha.Domain.Events;
using Saha.Domain.Exceptions;
using Xunit;

namespace Saha.Domain.Tests.Entities;

public sealed class ConversationTests
{
    private static readonly Guid CoupleA = Guid.NewGuid();
    private static readonly Guid HusbandA = Guid.NewGuid();
    private static readonly Guid WifeA = Guid.NewGuid();
    private static readonly Guid CoupleB = Guid.NewGuid();
    private static readonly Guid HusbandB = Guid.NewGuid();
    private static readonly Guid WifeB = Guid.NewGuid();
    private static readonly Guid CoupleC = Guid.NewGuid();
    private static readonly Guid HusbandC = Guid.NewGuid();
    private static readonly Guid WifeC = Guid.NewGuid();

    private static Conversation CreateGroup(string name = "Group") =>
        Conversation.CreateGroup(
            CoupleA,
            new List<(Guid, Guid, Guid)> { (CoupleA, HusbandA, WifeA), (CoupleB, HusbandB, WifeB) },
            name);

    // FR-1 / FR-6
    [Fact]
    public void CreatePartner_HasTwoParticipantsAndPartnerType()
    {
        var conv = Conversation.CreatePartner(CoupleA, HusbandA, WifeA);

        conv.Type.Should().Be(ConversationType.Partner);
        conv.Name.Should().BeNull();
        conv.OwnerCoupleId.Should().BeNull();
        conv.Participants.Should().HaveCount(2);
        conv.Participants.Select(p => p.PartnerId).Should().Contain(new[] { HusbandA, WifeA });
        conv.CoupleStates.Should().HaveCount(1);
        conv.DomainEvents.Should().ContainSingle(e => e is PartnerConversationCreatedEvent);
    }

    // FR-6
    [Fact]
    public void CreateGroup_AddsAllPartnersAndSetsOwner()
    {
        var conv = CreateGroup();

        conv.Type.Should().Be(ConversationType.Group);
        conv.OwnerCoupleId.Should().Be(CoupleA);
        conv.Name.Should().Be("Group");
        conv.Participants.Should().HaveCount(4);
        conv.CoupleStates.Should().HaveCount(2);
        conv.DomainEvents.Should().ContainSingle(e => e is GroupConversationCreatedEvent);
    }

    // FR-4
    [Fact]
    public void CreateGroup_WithSingleCouple_Throws()
    {
        var act = () => Conversation.CreateGroup(
            CoupleA,
            new List<(Guid, Guid, Guid)> { (CoupleA, HusbandA, WifeA) },
            "Group");

        act.Should().Throw<DomainException>().Which.Code.Should().Be("GROUP_NEEDS_TWO_COUPLES");
    }

    // FR-7
    [Fact]
    public void Rename_ByOwner_UpdatesName()
    {
        var conv = CreateGroup();

        conv.Rename(CoupleA, "New Name");

        conv.Name.Should().Be("New Name");
        conv.DomainEvents.Should().Contain(e => e is ConversationRenamedEvent);
    }

    // FR-7 / permissions
    [Fact]
    public void Rename_ByNonOwner_Throws()
    {
        var conv = CreateGroup();

        var act = () => conv.Rename(CoupleB, "New Name");

        act.Should().Throw<DomainException>().Which.Code.Should().Be("NOT_OWNER");
    }

    [Fact]
    public void Rename_OnPartnerConversation_Throws()
    {
        var conv = Conversation.CreatePartner(CoupleA, HusbandA, WifeA);

        var act = () => conv.Rename(CoupleA, "New Name");

        act.Should().Throw<DomainException>().Which.Code.Should().Be("NOT_A_GROUP");
    }

    // FR-8
    [Fact]
    public void AddCouple_ByParticipant_AddsBothPartners()
    {
        var conv = CreateGroup();

        conv.AddCouple(CoupleB, CoupleC, HusbandC, WifeC);

        conv.Participants.Should().HaveCount(6);
        conv.CoupleStates.Should().HaveCount(3);
        conv.HasCoupleParticipant(CoupleC).Should().BeTrue();
        conv.DomainEvents.Should().Contain(e => e is CoupleAddedToConversationEvent);
    }

    [Fact]
    public void AddCouple_WhenAlreadyPresent_Throws()
    {
        var conv = CreateGroup();

        var act = () => conv.AddCouple(CoupleA, CoupleB, HusbandB, WifeB);

        act.Should().Throw<DomainException>().Which.Code.Should().Be("COUPLE_ALREADY_IN_CONVERSATION");
    }

    [Fact]
    public void AddCouple_ByNonParticipant_Throws()
    {
        var conv = CreateGroup();

        var act = () => conv.AddCouple(CoupleC, CoupleC, HusbandC, WifeC);

        act.Should().Throw<DomainException>();
    }

    // FR-11
    [Fact]
    public void PinAndUnpin_ForCouple_TogglesState()
    {
        var conv = CreateGroup();

        conv.Pin(CoupleB);
        conv.IsPinnedFor(CoupleB).Should().BeTrue();

        conv.Unpin(CoupleB);
        conv.IsPinnedFor(CoupleB).Should().BeFalse();
    }

    // FR-2 / FR-3
    [Fact]
    public void Pin_OnPartnerConversation_Throws()
    {
        var conv = Conversation.CreatePartner(CoupleA, HusbandA, WifeA);

        var act = () => conv.Pin(CoupleA);

        act.Should().Throw<DomainException>().Which.Code.Should().Be("CANNOT_MODIFY_PARTNER_PIN");
    }

    // FR-12
    [Fact]
    public void HideForCouple_SetsHiddenForThatCoupleOnly()
    {
        var conv = CreateGroup();

        conv.HideForCouple(CoupleA);

        conv.IsHiddenFor(CoupleA).Should().BeTrue();
        conv.IsHiddenFor(CoupleB).Should().BeFalse();
    }

    // FR-3
    [Fact]
    public void HideForCouple_OnPartnerConversation_Throws()
    {
        var conv = Conversation.CreatePartner(CoupleA, HusbandA, WifeA);

        var act = () => conv.HideForCouple(CoupleA);

        act.Should().Throw<DomainException>().Which.Code.Should().Be("CANNOT_HIDE_PARTNER");
    }

    // D4 — new message un-hides
    [Fact]
    public void TouchActivity_UnhidesAllCoupleStatesAndSetsPreview()
    {
        var conv = CreateGroup();
        conv.HideForCouple(CoupleA);

        conv.TouchActivity("hello", HusbandB);

        conv.IsHiddenFor(CoupleA).Should().BeFalse();
        conv.LastMessagePreview.Should().Be("hello");
        conv.LastMessageSenderPartnerId.Should().Be(HusbandB);
    }

    [Fact]
    public void HasPartnerParticipant_ReflectsMembership()
    {
        var conv = CreateGroup();

        conv.HasPartnerParticipant(HusbandA).Should().BeTrue();
        conv.HasPartnerParticipant(HusbandC).Should().BeFalse();
    }
}
