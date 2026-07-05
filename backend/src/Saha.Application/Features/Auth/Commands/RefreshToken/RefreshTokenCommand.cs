using MediatR;

namespace Saha.Application.Features.Auth.Commands.RefreshToken;

public sealed record RefreshTokenCommand(string RefreshToken, string? IpAddress) : IRequest<RefreshTokenResult>;

public sealed record RefreshTokenResult(
    string AccessToken,
    string RefreshToken,
    DateTime AccessTokenExpiresAt,
    DateTime RefreshTokenExpiresAt);
