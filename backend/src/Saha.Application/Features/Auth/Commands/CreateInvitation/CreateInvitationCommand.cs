using MediatR;

namespace Saha.Application.Features.Auth.Commands.CreateInvitation;

/// <summary>
/// Issued by the registrant once the couple exists. The partner's name and email are collected here,
/// not during registration — the registering partner never types their partner's details into the
/// signup form.
/// </summary>
public sealed record CreateInvitationCommand(
    string InviteeName,
    string InviteeEmail) : IRequest<CreateInvitationResult>;

/// <summary>
/// <paramref name="Token"/> is returned exactly once, in plain text, and never persisted or logged.
/// </summary>
public sealed record CreateInvitationResult(
    Guid InvitationId,
    string Token,
    DateTime ExpiresAt);
