using MediatR;
using Saha.Application.Features.Auth.Common;

namespace Saha.Application.Features.Auth.Commands.Login;

public sealed record LoginCommand(
    string Username,
    string Password,
    string? IpAddress) : IRequest<AuthResult>;
