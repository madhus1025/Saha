using FluentAssertions;
using Saha.Domain.Entities;
using Saha.Domain.Enums;
using Saha.Domain.Events;
using Saha.Domain.Exceptions;
using Xunit;

namespace Saha.Domain.Tests.Entities;

public sealed class CoupleTests
{
    private static Couple CreateValidCouple(
        string togetherId = "MADHU-PRIYA",
        string husbandUsername = "madhu",
        string wifeUsername = "priya")
    {
        return Couple.Register(
            togetherId,
            husbandUsername, "Madhu Kumar", new DateTime(1990, 5, 15),
            "madhu@example.com", "+911234567890",
            wifeUsername, "Priya Kumar", new DateTime(1992, 8, 20),
            "priya@example.com", "+919876543210",
            "hashed_password_123");
    }

    [Fact]
    public void Register_WithValidData_CreatesCouple()
    {
        var couple = CreateValidCouple();

        couple.Should().NotBeNull();
        couple.Id.Should().NotBeEmpty();
        couple.TogetherID.Should().Be("MADHU-PRIYA");
        couple.Husband.Should().NotBeNull();
        couple.Wife.Should().NotBeNull();
        couple.Husband.Username.Should().Be("madhu");
        couple.Wife.Username.Should().Be("priya");
        couple.IsActive.Should().BeTrue();
    }

    [Fact]
    public void Register_WithValidData_RaisesCoupleRegisteredEvent()
    {
        var couple = CreateValidCouple();

        couple.DomainEvents.Should().HaveCount(1);
        couple.DomainEvents[0].Should().BeOfType<CoupleRegisteredEvent>();

        var @event = (CoupleRegisteredEvent)couple.DomainEvents[0];
        @event.TogetherID.Should().Be("MADHU-PRIYA");
        @event.HusbandEmail.Should().Be("madhu@example.com");
        @event.WifeEmail.Should().Be("priya@example.com");
    }

    [Fact]
    public void Register_WithSameUsernames_ThrowsDomainException()
    {
        var act = () => CreateValidCouple(husbandUsername: "same", wifeUsername: "same");

        act.Should().Throw<DomainException>()
            .WithMessage("*different usernames*");
    }

    [Fact]
    public void Register_WithSameEmails_ThrowsDomainException()
    {
        var act = () => Couple.Register(
            "MADHU-PRIYA",
            "madhu", "Madhu", new DateTime(1990, 1, 1), "same@example.com", "+911234567890",
            "priya", "Priya", new DateTime(1992, 1, 1), "same@example.com", "+919876543210",
            "hash");

        act.Should().Throw<DomainException>()
            .WithMessage("*different email*");
    }

    [Fact]
    public void Register_TogetherIdIsNormalized_ToUppercase()
    {
        var couple = CreateValidCouple(togetherId: "madhu-priya");
        couple.TogetherID.Should().Be("MADHU-PRIYA");
    }

    [Fact]
    public void GetPartner_WithValidPartnerId_ReturnsPartner()
    {
        var couple = CreateValidCouple();
        var husband = couple.GetPartner(couple.Husband.Id);

        husband.Should().NotBeNull();
        husband.Username.Should().Be("madhu");
        husband.Role.Should().Be(PartnerRole.Husband);
    }

    [Fact]
    public void GetOtherPartner_WithHusbandId_ReturnsWife()
    {
        var couple = CreateValidCouple();
        var wife = couple.GetOtherPartner(couple.Husband.Id);

        wife.Username.Should().Be("priya");
        wife.Role.Should().Be(PartnerRole.Wife);
    }

    [Fact]
    public void FindPartnerByUsername_WithValidUsername_ReturnsPartner()
    {
        var couple = CreateValidCouple();
        var partner = couple.FindPartnerByUsername("madhu");

        partner.Should().NotBeNull();
        partner!.Username.Should().Be("madhu");
    }

    [Fact]
    public void FindPartnerByUsername_WithInvalidUsername_ReturnsNull()
    {
        var couple = CreateValidCouple();
        var partner = couple.FindPartnerByUsername("unknown");

        partner.Should().BeNull();
    }

    [Fact]
    public void FindPartnerByUsername_IsCaseInsensitive()
    {
        var couple = CreateValidCouple();
        var partner = couple.FindPartnerByUsername("MADHU");

        partner.Should().NotBeNull();
    }

    [Fact]
    public void ChangePassword_UpdatesPasswordHash_AndRaisesEvent()
    {
        var couple = CreateValidCouple();
        couple.ClearDomainEvents();

        couple.ChangePassword("new_hashed_password");

        couple.PasswordHash.Should().Be("new_hashed_password");
        couple.DomainEvents.Should().HaveCount(1);
        couple.DomainEvents[0].Should().BeOfType<PasswordChangedEvent>();
    }

    [Fact]
    public void AddRefreshToken_AddsTokenToCollection()
    {
        var couple = CreateValidCouple();
        var token = RefreshToken.Create(couple.Id, couple.Husband.Id, "token_hash",
            DateTime.UtcNow.AddDays(30), "127.0.0.1");

        couple.AddRefreshToken(token);

        couple.RefreshTokens.Should().HaveCount(1);
    }

    [Fact]
    public void FindActiveRefreshToken_WithValidToken_ReturnsToken()
    {
        var couple = CreateValidCouple();
        var tokenHash = "valid_hash";
        var token = RefreshToken.Create(couple.Id, couple.Husband.Id, tokenHash,
            DateTime.UtcNow.AddDays(30), "127.0.0.1");
        couple.AddRefreshToken(token);

        var found = couple.FindActiveRefreshToken(tokenHash);

        found.Should().NotBeNull();
        found!.TokenHash.Should().Be(tokenHash);
    }

    [Fact]
    public void RevokeRefreshToken_RevokesToken()
    {
        var couple = CreateValidCouple();
        var tokenHash = "to_revoke";
        var token = RefreshToken.Create(couple.Id, couple.Husband.Id, tokenHash,
            DateTime.UtcNow.AddDays(30), "127.0.0.1");
        couple.AddRefreshToken(token);

        couple.RevokeRefreshToken(tokenHash, "Logout");

        couple.RefreshTokens[0].IsRevoked.Should().BeTrue();
        couple.RefreshTokens[0].RevokedReason.Should().Be("Logout");
    }

    [Fact]
    public void Deactivate_SetsIsActiveFalse_AndRevokesTokens()
    {
        var couple = CreateValidCouple();
        var token = RefreshToken.Create(couple.Id, couple.Husband.Id, "hash",
            DateTime.UtcNow.AddDays(30), "127.0.0.1");
        couple.AddRefreshToken(token);

        couple.Deactivate();

        couple.IsActive.Should().BeFalse();
        couple.RefreshTokens[0].IsRevoked.Should().BeTrue();
    }
}
