namespace Saha.Domain.Entities;

public sealed class RefreshToken : Entity
{
    public string TokenHash { get; private set; } = default!;
    public Guid CoupleId { get; private set; }
    public Guid PartnerId { get; private set; }
    public DateTime ExpiresAt { get; private set; }
    public bool IsRevoked { get; private set; }
    public string? RevokedReason { get; private set; }
    public DateTime? RevokedAt { get; private set; }
    public string? ReplacedByTokenHash { get; private set; }
    public string CreatedByIp { get; private set; } = default!;

    private RefreshToken() { }

    public static RefreshToken Create(
        Guid coupleId,
        Guid partnerId,
        string tokenHash,
        DateTime expiresAt,
        string createdByIp)
    {
        return new RefreshToken
        {
            Id = Guid.NewGuid(),
            CoupleId = coupleId,
            PartnerId = partnerId,
            TokenHash = tokenHash,
            ExpiresAt = expiresAt,
            CreatedByIp = createdByIp,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    public void Revoke(string reason, string? replacedByTokenHash = null)
    {
        IsRevoked = true;
        RevokedReason = reason;
        RevokedAt = DateTime.UtcNow;
        ReplacedByTokenHash = replacedByTokenHash;
        UpdateTimestamp();
    }

    public bool IsActive => !IsRevoked && ExpiresAt > DateTime.UtcNow;
}
