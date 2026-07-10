using FluentAssertions;
using Saha.Domain.Entities;
using Saha.Domain.Enums;
using Saha.Domain.Events;
using Saha.Domain.Exceptions;
using Saha.Domain.Tests.TestHelpers;
using Xunit;

namespace Saha.Domain.Tests.Entities;

public sealed class CoupleTests
{
    // ── Register: one partner only (AC1) ──────────────────────────────────────

    [Fact]
    public void Register_CreatesCoupleWithOnlyTheRegistrant()
    {
        var couple = CoupleBuilder.AwaitingPartner();

        couple.Should().NotBeNull();
        couple.Id.Should().NotBeEmpty();
        couple.TogetherID.Should().Be("MADHU-PRIYA");
        couple.Partners.Should().HaveCount(1);
        couple.IsActive.Should().BeTrue();
    }

    [Fact]
    public void Register_LeavesCoupleAwaitingPartner()
    {
        var couple = CoupleBuilder.AwaitingPartner();

        couple.State.Should().Be(CoupleState.AwaitingPartner);
        couple.IsComplete.Should().BeFalse();
    }

    [Fact]
    public void Register_AsHusband_LeavesWifeNull()
    {
        var couple = CoupleBuilder.AwaitingPartner(role: PartnerRole.Husband);

        couple.Husband.Should().NotBeNull();
        couple.Husband!.Username.Should().Be("madhu");
        couple.Wife.Should().BeNull();
    }

    [Fact]
    public void Register_AsWife_LeavesHusbandNull()
    {
        var couple = CoupleBuilder.AwaitingPartner(username: "priya", role: PartnerRole.Wife);

        couple.Wife.Should().NotBeNull();
        couple.Wife!.Username.Should().Be("priya");
        couple.Husband.Should().BeNull();
    }

    [Fact]
    public void Register_TogetherIdIsNormalized_ToUppercase()
    {
        var couple = CoupleBuilder.AwaitingPartner(togetherId: "madhu-priya");
        couple.TogetherID.Should().Be("MADHU-PRIYA");
    }

    [Fact]
    public void Register_RaisesCoupleRegisteredEvent_NamingOnlyTheRegistrant()
    {
        var couple = CoupleBuilder.AwaitingPartner();

        couple.DomainEvents.Should().HaveCount(1);
        var @event = couple.DomainEvents[0].Should().BeOfType<CoupleRegisteredEvent>().Subject;

        @event.CoupleId.Should().Be(couple.Id);
        @event.TogetherID.Should().Be("MADHU-PRIYA");
        @event.RegistrantEmail.Should().Be("madhu@example.com");
        @event.RegistrantName.Should().Be("Madhu Kumar");
        @event.RegistrantRole.Should().Be(PartnerRole.Husband);
    }

    [Fact]
    public void Register_DoesNotRaiseCoupleCompletedEvent()
    {
        var couple = CoupleBuilder.AwaitingPartner();

        couple.DomainEvents.Should().NotContain(e => e is CoupleCompletedEvent);
    }

    // ── RequireHusband / RequireWife (AC5) ────────────────────────────────────

    [Fact]
    public void RequireWife_OnAwaitingPartnerCouple_ThrowsCoupleIncomplete()
    {
        var couple = CoupleBuilder.AwaitingPartner(role: PartnerRole.Husband);

        var act = () => couple.RequireWife();

        act.Should().Throw<DomainException>().Which.Code.Should().Be("COUPLE_INCOMPLETE");
    }

    [Fact]
    public void RequireHusband_OnCompleteCouple_ReturnsHusband()
    {
        var couple = CoupleBuilder.Complete();

        couple.RequireHusband().Username.Should().Be("madhu");
        couple.RequireWife().Username.Should().Be("priya");
    }

    // ── AcceptPartner (AC2, AC3, AC4) ─────────────────────────────────────────

    [Fact]
    public void AcceptPartner_TransitionsToComplete()
    {
        var couple = CoupleBuilder.AwaitingPartner(role: PartnerRole.Husband);

        couple.AcceptPartner("priya", "Priya Kumar", new DateTime(1992, 8, 20),
            "priya@example.com", "+919876543210");

        couple.State.Should().Be(CoupleState.Complete);
        couple.IsComplete.Should().BeTrue();
        couple.Partners.Should().HaveCount(2);
    }

    [Fact]
    public void AcceptPartner_AssignsComplementaryRole_WhenRegistrantIsHusband()
    {
        var couple = CoupleBuilder.AwaitingPartner(role: PartnerRole.Husband);

        var invitee = couple.AcceptPartner("priya", "Priya Kumar", new DateTime(1992, 8, 20),
            "priya@example.com", "+919876543210");

        invitee.Role.Should().Be(PartnerRole.Wife);
        couple.Wife!.Username.Should().Be("priya");
    }

    [Fact]
    public void AcceptPartner_AssignsComplementaryRole_WhenRegistrantIsWife()
    {
        var couple = CoupleBuilder.AwaitingPartner(username: "priya", email: "priya@example.com",
            role: PartnerRole.Wife);

        var invitee = couple.AcceptPartner("madhu", "Madhu Kumar", new DateTime(1990, 5, 15),
            "madhu@example.com", "+911234567890");

        invitee.Role.Should().Be(PartnerRole.Husband);
        couple.Husband!.Username.Should().Be("madhu");
    }

    [Fact]
    public void AcceptPartner_RaisesCoupleCompletedEvent()
    {
        var couple = CoupleBuilder.AwaitingPartner();
        couple.ClearDomainEvents();

        couple.AcceptPartner("priya", "Priya Kumar", new DateTime(1992, 8, 20),
            "priya@example.com", "+919876543210");

        couple.DomainEvents.Should().HaveCount(1);
        var @event = couple.DomainEvents[0].Should().BeOfType<CoupleCompletedEvent>().Subject;

        @event.CoupleId.Should().Be(couple.Id);
        @event.HusbandId.Should().Be(couple.Husband!.Id);
        @event.WifeId.Should().Be(couple.Wife!.Id);
        @event.HusbandEmail.Should().Be("madhu@example.com");
        @event.WifeEmail.Should().Be("priya@example.com");
    }

    [Fact]
    public void AcceptPartner_OnCompleteCouple_ThrowsCoupleAlreadyComplete()
    {
        var couple = CoupleBuilder.Complete();

        var act = () => couple.AcceptPartner("third", "Third Wheel", new DateTime(1991, 1, 1),
            "third@example.com", "+911111111111");

        act.Should().Throw<DomainException>().Which.Code.Should().Be("COUPLE_ALREADY_COMPLETE");
    }

    [Theory]
    [InlineData("madhu")]
    [InlineData("MADHU")]
    public void AcceptPartner_WithRegistrantsUsername_ThrowsUsernamesMustDiffer(string username)
    {
        var couple = CoupleBuilder.AwaitingPartner(username: "madhu");

        var act = () => couple.AcceptPartner(username, "Priya", new DateTime(1992, 8, 20),
            "priya@example.com", "+919876543210");

        act.Should().Throw<DomainException>().Which.Code.Should().Be("USERNAMES_MUST_DIFFER");
    }

    [Theory]
    [InlineData("madhu@example.com")]
    [InlineData("MADHU@EXAMPLE.COM")]
    public void AcceptPartner_WithRegistrantsEmail_ThrowsEmailsMustDiffer(string email)
    {
        var couple = CoupleBuilder.AwaitingPartner(email: "madhu@example.com");

        var act = () => couple.AcceptPartner("priya", "Priya", new DateTime(1992, 8, 20),
            email, "+919876543210");

        act.Should().Throw<DomainException>().Which.Code.Should().Be("EMAILS_MUST_DIFFER");
    }

    // ── Partner lookups tolerate a solo couple (AC5) ──────────────────────────

    [Fact]
    public void GetPartner_WithValidPartnerId_ReturnsPartner()
    {
        var couple = CoupleBuilder.Complete();
        var husband = couple.GetPartner(couple.Husband!.Id);

        husband.Username.Should().Be("madhu");
        husband.Role.Should().Be(PartnerRole.Husband);
    }

    [Fact]
    public void GetPartner_OnAwaitingPartnerCouple_ReturnsTheRegistrant()
    {
        var couple = CoupleBuilder.AwaitingPartner();
        var registrant = couple.Partners[0];

        couple.GetPartner(registrant.Id).Should().Be(registrant);
    }

    [Fact]
    public void GetPartner_WithUnknownId_ThrowsPartnerNotFound()
    {
        var couple = CoupleBuilder.Complete();

        var act = () => couple.GetPartner(Guid.NewGuid());

        act.Should().Throw<DomainException>().Which.Code.Should().Be("PARTNER_NOT_FOUND");
    }

    [Fact]
    public void GetOtherPartner_WithHusbandId_ReturnsWife()
    {
        var couple = CoupleBuilder.Complete();
        var wife = couple.GetOtherPartner(couple.Husband!.Id);

        wife!.Username.Should().Be("priya");
        wife.Role.Should().Be(PartnerRole.Wife);
    }

    [Fact]
    public void GetOtherPartner_OnAwaitingPartnerCouple_ReturnsNull()
    {
        var couple = CoupleBuilder.AwaitingPartner();
        var registrant = couple.Partners[0];

        couple.GetOtherPartner(registrant.Id).Should().BeNull();
    }

    [Fact]
    public void GetOtherPartner_WithUnknownId_ThrowsPartnerNotFound()
    {
        var couple = CoupleBuilder.AwaitingPartner();

        var act = () => couple.GetOtherPartner(Guid.NewGuid());

        act.Should().Throw<DomainException>().Which.Code.Should().Be("PARTNER_NOT_FOUND");
    }

    [Fact]
    public void FindPartnerByUsername_OnAwaitingPartnerCouple_ReturnsRegistrant()
    {
        var couple = CoupleBuilder.AwaitingPartner(username: "madhu");

        var partner = couple.FindPartnerByUsername("madhu");

        partner.Should().NotBeNull();
        partner!.Username.Should().Be("madhu");
    }

    [Fact]
    public void FindPartnerByUsername_WithInvalidUsername_ReturnsNull()
    {
        var couple = CoupleBuilder.Complete();

        couple.FindPartnerByUsername("unknown").Should().BeNull();
    }

    [Fact]
    public void FindPartnerByUsername_IsCaseInsensitive()
    {
        var couple = CoupleBuilder.Complete();

        couple.FindPartnerByUsername("MADHU").Should().NotBeNull();
    }

    // ── ChangePassword works with one or two partners (AC5) ───────────────────

    [Fact]
    public void ChangePassword_UpdatesPasswordHash_AndRaisesEvent()
    {
        var couple = CoupleBuilder.Complete();
        couple.ClearDomainEvents();

        couple.ChangePassword("new_hashed_password");

        couple.PasswordHash.Should().Be("new_hashed_password");
        couple.DomainEvents.Should().HaveCount(1);
        var @event = couple.DomainEvents[0].Should().BeOfType<PasswordChangedEvent>().Subject;
        @event.Emails.Should().BeEquivalentTo("madhu@example.com", "priya@example.com");
    }

    [Fact]
    public void ChangePassword_OnAwaitingPartnerCouple_RaisesEventForTheOnePartner()
    {
        var couple = CoupleBuilder.AwaitingPartner();
        couple.ClearDomainEvents();

        couple.ChangePassword("new_hashed_password");

        var @event = couple.DomainEvents[0].Should().BeOfType<PasswordChangedEvent>().Subject;
        @event.Emails.Should().ContainSingle().Which.Should().Be("madhu@example.com");
    }

    // ── Tokens & deactivation (unchanged behaviour) ───────────────────────────

    [Fact]
    public void AddRefreshToken_AddsTokenToCollection()
    {
        var couple = CoupleBuilder.Complete();
        var token = RefreshToken.Create(couple.Id, couple.Husband!.Id, "token_hash",
            DateTime.UtcNow.AddDays(30), "127.0.0.1");

        couple.AddRefreshToken(token);

        couple.RefreshTokens.Should().HaveCount(1);
    }

    [Fact]
    public void FindActiveRefreshToken_WithValidToken_ReturnsToken()
    {
        var couple = CoupleBuilder.Complete();
        const string tokenHash = "valid_hash";
        couple.AddRefreshToken(RefreshToken.Create(couple.Id, couple.Husband!.Id, tokenHash,
            DateTime.UtcNow.AddDays(30), "127.0.0.1"));

        var found = couple.FindActiveRefreshToken(tokenHash);

        found.Should().NotBeNull();
        found!.TokenHash.Should().Be(tokenHash);
    }

    [Fact]
    public void RevokeRefreshToken_RevokesToken()
    {
        var couple = CoupleBuilder.Complete();
        const string tokenHash = "to_revoke";
        couple.AddRefreshToken(RefreshToken.Create(couple.Id, couple.Husband!.Id, tokenHash,
            DateTime.UtcNow.AddDays(30), "127.0.0.1"));

        couple.RevokeRefreshToken(tokenHash, "Logout");

        couple.RefreshTokens[0].IsRevoked.Should().BeTrue();
        couple.RefreshTokens[0].RevokedReason.Should().Be("Logout");
    }

    [Fact]
    public void Deactivate_SetsIsActiveFalse_AndRevokesTokens()
    {
        var couple = CoupleBuilder.Complete();
        couple.AddRefreshToken(RefreshToken.Create(couple.Id, couple.Husband!.Id, "hash",
            DateTime.UtcNow.AddDays(30), "127.0.0.1"));

        couple.Deactivate();

        couple.IsActive.Should().BeFalse();
        couple.RefreshTokens[0].IsRevoked.Should().BeTrue();
    }
}
