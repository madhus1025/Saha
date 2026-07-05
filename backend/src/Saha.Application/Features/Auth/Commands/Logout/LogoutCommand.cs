using MediatR;

namespace Saha.Application.Features.Auth.Commands.Logout;

public sealed record LogoutCommand(string RefreshToken) : IRequest;
