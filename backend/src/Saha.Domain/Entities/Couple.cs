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
    public CoupleState State { get; private set; } = CoupleState.AwaitingPartner;

    private readonly List<Partner> _partners = [];
    private readonly List<RefreshToken> _refreshTokens = [];
    private readonly List<PasswordResetToken> _passwordResetTokens = [];
    private readonly List<CoupleInvitation> _invitations = [];

    public IReadOnlyList<Partner> Partners => _partners.AsReadOnly();
    public IReadOnlyList<CoupleInvitation> Invitations => _invitations.AsReadOnly();

    /// <summary>True once both partners are present. Guard every two-partner operation on this.</summary>
    public bool IsComplete => State == CoupleState.Complete;

    // Nullable on purpose: a couple awaiting its partner has only one of these. Making the absence
    // visible to the compiler is what stops a half-formed couple from faulting a caller at runtime.
    public Partner? Husband => _partners.SingleOrDefault(p => p.Role == PartnerRole.Husband);
    public Partner? Wife => _partners.SingleOrDefault(p => p.Role == PartnerRole.Wife);

    public IReadOnlyList<RefreshToken> RefreshTokens => _refreshTokens.AsReadOnly();
    public IReadOnlyList<PasswordResetToken> PasswordResetTokens => _passwordResetTokens.AsReadOnly();

    private Couple() { }

    /// <summary>Creates the couple with only the registrant present. The partner arrives via <see cref="AcceptPartner"/>.</summary>
    public static Couple Register(
        string togetherId,
        string username,
        string name,
        DateTime dateOfBirth,
        string email,
        string phoneNumber,
        PartnerRole role,
        string passwordHash)
    {
        var validatedTogetherId = ValueObjects.TogetherID.Create(togetherId);

        var coupleId = Guid.NewGuid();
        var registrant = Partner.Create(username, name, dateOfBirth, email, phoneNumber, role, coupleId);

        var couple = new Couple
        {
            Id = coupleId,
            TogetherID = validatedTogetherId.Value,
            PasswordHash = passwordHash,
            State = CoupleState.AwaitingPartner,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        couple._partners.Add(registrant);

        couple.RaiseDomainEvent(new CoupleRegisteredEvent(
            coupleId,
            validatedTogetherId.Value,
            registrant.Email,
            registrant.Name,
            registrant.Role));

        return couple;
    }

    /// <summary>
    /// The invited partner supplies their own half. Their role is the complement of the registrant's —
    /// it is never chosen by the caller, so "exactly one Husband, one Wife" stays an invariant here.
    /// </summary>
    public Partner AcceptPartner(
        string username,
        string name,
        DateTime dateOfBirth,
        string email,
        string phoneNumber)
    {
        if (IsComplete)
            throw new DomainException("COUPLE_ALREADY_COMPLETE", "This home already has both partners.");

        var registrant = _partners.Single();

        if (username.Equals(registrant.Username, StringComparison.OrdinalIgnoreCase))
            throw new DomainException("USERNAMES_MUST_DIFFER", "Both partners must have different usernames.");

        if (email.Equals(registrant.Email, StringComparison.OrdinalIgnoreCase))
            throw new DomainException("EMAILS_MUST_DIFFER", "Both partners must have different email addresses.");

        var inviteeRole = registrant.Role == PartnerRole.Husband ? PartnerRole.Wife : PartnerRole.Husband;
        var invitee = Partner.Create(username, name, dateOfBirth, email, phoneNumber, inviteeRole, Id);

        _partners.Add(invitee);
        State = CoupleState.Complete;
        UpdateTimestamp();

        var husband = RequireHusband();
        var wife = RequireWife();

        RaiseDomainEvent(new CoupleCompletedEvent(
            Id, TogetherID,
            husband.Id, wife.Id,
            husband.Email, wife.Email,
            husband.Name, wife.Name));

        return invitee;
    }

    /// <summary>Issues an invitation for the second partner, superseding any still-pending one.</summary>
    public CoupleInvitation CreateInvitation(
        string inviteeName,
        string inviteeEmail,
        string tokenHash,
        DateTime expiresAt)
    {
        if (IsComplete)
            throw new DomainException("COUPLE_ALREADY_COMPLETE", "This home already has both partners.");

        foreach (var pending in _invitations.Where(i => i.IsPending))
            pending.Supersede();

        var invitation = CoupleInvitation.Create(Id, inviteeName, inviteeEmail, tokenHash, expiresAt);
        _invitations.Add(invitation);
        UpdateTimestamp();

        return invitation;
    }

    /// <summary>The pending, unexpired invitation matching <paramref name="tokenHash"/>, if any.</summary>
    public CoupleInvitation? FindUsableInvitation(string tokenHash) =>
        _invitations.FirstOrDefault(i => i.TokenHash == tokenHash && i.IsUsable);

    /// <summary>The husband, or <c>COUPLE_INCOMPLETE</c> if the couple is still awaiting its partner.</summary>
    public Partner RequireHusband() =>
        Husband ?? throw new DomainException("COUPLE_INCOMPLETE", "This home is still waiting for a partner.");

    /// <summary>The wife, or <c>COUPLE_INCOMPLETE</c> if the couple is still awaiting its partner.</summary>
    public Partner RequireWife() =>
        Wife ?? throw new DomainException("COUPLE_INCOMPLETE", "This home is still waiting for a partner.");

    public Partner GetPartner(Guid partnerId) =>
        _partners.SingleOrDefault(p => p.Id == partnerId)
        ?? throw new DomainException("PARTNER_NOT_FOUND", "Partner not found in this couple.");

    /// <summary>The other partner, or <c>null</c> while the couple is awaiting its partner.</summary>
    public Partner? GetOtherPartner(Guid partnerId)
    {
        if (_partners.All(p => p.Id != partnerId))
            throw new DomainException("PARTNER_NOT_FOUND", "Partner not found in this couple.");

        return _partners.SingleOrDefault(p => p.Id != partnerId);
    }

    public Partner? FindPartnerByUsername(string username)
    {
        var normalized = username.ToLowerInvariant();
        return _partners.SingleOrDefault(p => p.Username == normalized);
    }

    public void ChangePassword(string newPasswordHash)
    {
        if (string.IsNullOrWhiteSpace(newPasswordHash))
            throw new DomainException("INVALID_PASSWORD_HASH", "Password hash cannot be empty.");

        PasswordHash = newPasswordHash;
        RevokeAllRefreshTokens("Password changed");
        UpdateTimestamp();

        RaiseDomainEvent(new PasswordChangedEvent(
            Id, TogetherID, _partners.Select(p => p.Email).ToList()));
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
