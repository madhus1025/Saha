namespace Saha.Application.Common.Interfaces;

public interface ICurrentUserContext
{
    Guid CoupleId { get; }
    Guid PartnerId { get; }
    string Username { get; }
    string TogetherID { get; }
    string Role { get; }
    bool IsAuthenticated { get; }
    string? IpAddress { get; }
    string? UserAgent { get; }
}
