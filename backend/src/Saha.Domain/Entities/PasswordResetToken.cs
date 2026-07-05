namespace Saha.Domain.Entities;

public sealed class PasswordResetToken : Entity
{
    public Guid CoupleId { get; private set; }
    public string CodeHash { get; private set; } = default!;
    public DateTime ExpiresAt { get; private set; }
    public bool IsUsed { get; private set; }
    public DateTime? UsedAt { get; private set; }

    private PasswordResetToken() { }

    public static PasswordResetToken Create(Guid coupleId, string codeHash, DateTime expiresAt)
    {
        return new PasswordResetToken
        {
            Id = Guid.NewGuid(),
            CoupleId = coupleId,
            CodeHash = codeHash,
            ExpiresAt = expiresAt,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    public void MarkAsUsed()
    {
        IsUsed = true;
        UsedAt = DateTime.UtcNow;
        UpdateTimestamp();
    }

    public void Invalidate()
    {
        IsUsed = true;
        UpdateTimestamp();
    }

    public bool IsValid => !IsUsed && ExpiresAt > DateTime.UtcNow;
}
