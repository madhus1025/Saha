using MediatR;

namespace Saha.Application.Features.Auth.Commands.Login;

public sealed record LoginCommand(
    string Username,
    string Password,
    string? IpAddress) : IRequest<LoginResult>;

public sealed record LoginResult(
    string AccessToken,
    string RefreshToken,
    DateTime AccessTokenExpiresAt,
    DateTime RefreshTokenExpiresAt,
    Guid CoupleId,
    Guid PartnerId,
    string Username,
    string PartnerName,
    string TogetherID,
    string Role,
    string? ProfilePictureUrl);
