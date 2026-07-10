using Saha.Domain.Enums;
using Saha.Domain.Exceptions;
using Saha.Domain.ValueObjects;

namespace Saha.Domain.Entities;

/// <summary>
/// An invitation for the second partner to complete the couple. The token is stored as a
/// deterministic SHA-256 hash (never in plain text) so it can be looked up without a table scan —
/// the same treatment <see cref="RefreshToken"/> receives.
/// </summary>
public sealed class CoupleInvitation : Entity
{
    public Guid CoupleId { get; private set; }
    public string InviteeName { get; private set; } = default!;
    public string InviteeEmail { get; private set; } = default!;
    public string TokenHash { get; private set; } = default!;
    public DateTime ExpiresAt { get; private set; }
    public DateTime? AcceptedAt { get; private set; }
    public InvitationStatus Status { get; private set; } = InvitationStatus.Pending;

    private CoupleInvitation() { }

    public static CoupleInvitation Create(
        Guid coupleId,
        string inviteeName,
        string inviteeEmail,
        string tokenHash,
        DateTime expiresAt)
    {
        if (string.IsNullOrWhiteSpace(inviteeName) || inviteeName.Trim().Length > 100)
            throw new DomainValidationException(nameof(InviteeName), "Their name cannot be empty or exceed 100 characters.");

        if (string.IsNullOrWhiteSpace(tokenHash))
            throw new DomainValidationException(nameof(TokenHash), "Invitation token hash cannot be empty.");

        var validatedEmail = EmailAddress.Create(inviteeEmail);

        return new CoupleInvitation
        {
            Id = Guid.NewGuid(),
            CoupleId = coupleId,
            InviteeName = inviteeName.Trim(),
            InviteeEmail = validatedEmail.Value,
            TokenHash = tokenHash,
            ExpiresAt = expiresAt,
            Status = InvitationStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    public bool IsPending => Status == InvitationStatus.Pending;
    public bool IsExpired => ExpiresAt <= DateTime.UtcNow;
    public bool IsUsable => IsPending && !IsExpired;

    public void MarkAccepted()
    {
        if (!IsPending)
            throw new DomainException("INVITATION_NOT_PENDING", "This invitation has already been used.");

        Status = InvitationStatus.Accepted;
        AcceptedAt = DateTime.UtcNow;
        UpdateTimestamp();
    }

    public void Supersede()
    {
        if (!IsPending) return;

        Status = InvitationStatus.Superseded;
        UpdateTimestamp();
    }
}
