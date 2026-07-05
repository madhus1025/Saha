namespace Saha.Domain.Entities;

public abstract class Entity
{
    public Guid Id { get; protected set; } = Guid.NewGuid();
    public DateTime CreatedAt { get; protected set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; protected set; } = DateTime.UtcNow;

    protected void UpdateTimestamp() => UpdatedAt = DateTime.UtcNow;

    public override bool Equals(object? obj)
    {
        if (obj is not Entity other) return false;
        if (ReferenceEquals(this, other)) return true;
        if (GetType() != other.GetType()) return false;
        return Id == other.Id;
    }

    public override int GetHashCode() => Id.GetHashCode();

    public static bool operator ==(Entity? left, Entity? right) =>
        left?.Equals(right) ?? right is null;

    public static bool operator !=(Entity? left, Entity? right) => !(left == right);
}
