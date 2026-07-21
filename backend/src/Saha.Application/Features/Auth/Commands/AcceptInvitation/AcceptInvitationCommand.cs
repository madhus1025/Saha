using MediatR;
using Saha.Application.Features.Auth.Common;

namespace Saha.Application.Features.Auth.Commands.AcceptInvitation;

/// <summary>
/// The invited partner supplies their own half. Their role is derived from the registrant's — it is
/// never accepted from the request.
/// </summary>
public sealed record AcceptInvitationCommand(
    string Token,
    string Username,
    string Name,
    DateTime DateOfBirth,
    string Email,
    string PhoneNumber,
    string? IpAddress = null) : IRequest<AuthResult>;
