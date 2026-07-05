using Saha.Domain.Enums;
using Saha.Domain.Events;
using Saha.Domain.Exceptions;
using Saha.Domain.ValueObjects;

namespace Saha.Domain.Entities;

public sealed class Couple : AggregateRoot
{
    public string TogetherID { get; private set; } = default!;
    public string PasswordHash { get; private set; } = default!;
    public bool IsActive { get; private set; } = true;

    private readonly List<Partner> _partners = [];
    private readonly List<RefreshToken> _refreshTokens = [];
    private readonly List<PasswordResetToken> _passwordResetTokens = [];

    public IReadOnlyList<Partner> Partners => _partners.AsReadOnly();
    public Partner Husband => _partners.Single(p => p.Role == PartnerRole.Husband);
    public Partner Wife => _partners.Single(p => p.Role == PartnerRole.Wife);

    public IReadOnlyList<RefreshToken> RefreshTokens => _refreshTokens.AsReadOnly();
    public IReadOnlyList<PasswordResetToken> PasswordResetTokens => _passwordResetTokens.AsReadOnly();

    private Couple() { }

    public static Couple Register(
        string togetherId,
        string husbandUsername,
        string husbandName,
        DateTime husbandDob,
        string husbandEmail,
        string husbandPhone,
        string wifeUsername,
        string wifeName,
        DateTime wifeDob,
        string wifeEmail,
        string wifePhone,
        string passwordHash)
    {
        var validatedTogetherId = ValueObjects.TogetherID.Create(togetherId);

        if (husbandUsername.Equals(wifeUsername, StringComparison.OrdinalIgnoreCase))
            throw new DomainException("USERNAMES_MUST_DIFFER", "Husband and wife must have different usernames.");

        if (husbandEmail.Equals(wifeEmail, StringComparison.OrdinalIgnoreCase))
            throw new DomainException("EMAILS_MUST_DIFFER", "Husband and wife must have different email addresses.");

        var coupleId = Guid.NewGuid();

        var husband = Partner.Create(husbandUsername, husbandName, husbandDob, husbandEmail, husbandPhone, PartnerRole.Husband, coupleId);
        var wife = Partner.Create(wifeUsername, wifeName, wifeDob, wifeEmail, wifePhone, PartnerRole.Wife, coupleId);

        var couple = new Couple
        {
            Id = coupleId,
            TogetherID = validatedTogetherId.Value,
            PasswordHash = passwordHash,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        couple._partners.Add(husband);
        couple._partners.Add(wife);

        couple.RaiseDomainEvent(new CoupleRegisteredEvent(
            coupleId,
            validatedTogetherId.Value,
            husbandEmail,
            wifeEmail,
            husbandName,
            wifeName));

        return couple;
    }

    public Partner GetPartner(Guid partnerId)
    {
        if (Husband.Id == partnerId) return Husband;
        if (Wife.Id == partnerId) return Wife;
        throw new DomainException("PARTNER_NOT_FOUND", "Partner not found in this couple.");
    }

    public Partner GetOtherPartner(Guid partnerId)
    {
        if (Husband.Id == partnerId) return Wife;
        if (Wife.Id == partnerId) return Husband;
        throw new DomainException("PARTNER_NOT_FOUND", "Partner not found in this couple.");
    }

    public Partner? FindPartnerByUsername(string username)
    {
        var normalized = username.ToLowerInvariant();
        if (Husband.Username == normalized) return Husband;
        if (Wife.Username == normalized) return Wife;
        return null;
    }

    public void ChangePassword(string newPasswordHash)
    {
        if (string.IsNullOrWhiteSpace(newPasswordHash))
            throw new DomainException("INVALID_PASSWORD_HASH", "Password hash cannot be empty.");

        PasswordHash = newPasswordHash;
        RevokeAllRefreshTokens("Password changed");
        UpdateTimestamp();

        RaiseDomainEvent(new PasswordChangedEvent(Id, TogetherID, Husband.Email, Wife.Email));
    }

    public void AddRefreshToken(RefreshToken token)
    {
        _refreshTokens.Add(token);
        UpdateTimestamp();
    }

    public RefreshToken? FindActiveRefreshToken(string tokenHash)
    {
        return _refreshTokens.FirstOrDefault(t =>
            t.TokenHash == tokenHash &&
            !t.IsRevoked &&
            t.ExpiresAt > DateTime.UtcNow);
    }

    public void RevokeRefreshToken(string tokenHash, string reason)
    {
        var token = _refreshTokens.FirstOrDefault(t => t.TokenHash == tokenHash);
        token?.Revoke(reason);
        UpdateTimestamp();
    }

    public void RevokeAllRefreshTokens(string reason)
    {
        foreach (var token in _refreshTokens.Where(t => !t.IsRevoked))
            token.Revoke(reason);
        UpdateTimestamp();
    }

    public PasswordResetToken CreatePasswordResetToken(string codeHash, DateTime expiresAt)
    {
        foreach (var existing in _passwordResetTokens.Where(t => !t.IsUsed && t.ExpiresAt > DateTime.UtcNow))
            existing.Invalidate();

        var resetToken = PasswordResetToken.Create(Id, codeHash, expiresAt);
        _passwordResetTokens.Add(resetToken);
        UpdateTimestamp();
        return resetToken;
    }

    public PasswordResetToken? FindActiveResetToken(string plainCode, Interfaces.Services.IPasswordHasher hasher)
    {
        return _passwordResetTokens.FirstOrDefault(t =>
            !t.IsUsed &&
            t.ExpiresAt > DateTime.UtcNow &&
            hasher.Verify(plainCode, t.CodeHash));
    }

    public void Deactivate()
    {
        IsActive = false;
        RevokeAllRefreshTokens("Account deactivated");
        UpdateTimestamp();
    }
}
