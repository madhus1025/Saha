using MediatR;
using Saha.Application.Common.Exceptions;
using Saha.Application.Common.Interfaces;
using Saha.Application.Common.Persistence;
using Saha.Application.Features.Auth.Common;
using Saha.Domain.Interfaces.Repositories;

namespace Saha.Application.Features.Auth.Commands.AcceptInvitation;

public sealed class AcceptInvitationCommandHandler : IRequestHandler<AcceptInvitationCommand, AuthResult>
{
    private readonly ICoupleRepository _coupleRepository;
    private readonly ITokenService _tokenService;
    private readonly IAuthTokenIssuer _tokenIssuer;
    private readonly IAuditLogger _auditLogger;
    private readonly ICurrentUserContext _currentUser;

    public AcceptInvitationCommandHandler(
        ICoupleRepository coupleRepository,
        ITokenService tokenService,
        IAuthTokenIssuer tokenIssuer,
        IAuditLogger auditLogger,
        ICurrentUserContext currentUser)
    {
        _coupleRepository = coupleRepository;
        _tokenService = tokenService;
        _tokenIssuer = tokenIssuer;
        _auditLogger = auditLogger;
        _currentUser = currentUser;
    }

    public async Task<AuthResult> Handle(AcceptInvitationCommand request, CancellationToken cancellationToken)
    {
        var tokenHash = _tokenService.HashToken(request.Token);

        var couple = await _coupleRepository.GetByInvitationTokenHashAsync(tokenHash, cancellationToken);
        if (couple is null)
            throw new NotFoundException("Invitation", "token");

        var invitation = couple.FindUsableInvitation(tokenHash);
        if (invitation is null)
            throw new ConflictException("INVITATION_EXPIRED", "That invitation is no longer valid.");

        if (couple.IsComplete)
            throw new ConflictException("COUPLE_ALREADY_COMPLETE", "This home already has both partners.");

        var normalizedUsername = request.Username.Trim().ToLowerInvariant();
        if (await _coupleRepository.ExistsByUsernameAsync(normalizedUsername, cancellationToken))
            throw new ConflictException("USERNAME_TAKEN", $"'{normalizedUsername}' is already taken.");

        // Raises CoupleCompletedEvent, which provisions the couple's partner conversation on save.
        var invitee = couple.AcceptPartner(
            normalizedUsername,
            request.Name,
            request.DateOfBirth,
            request.Email,
            request.PhoneNumber);

        invitation.MarkAccepted();

        var tokens = _tokenIssuer.IssueFor(couple, invitee, request.IpAddress ?? _currentUser.IpAddress);

        try
        {
            await _coupleRepository.UpdateAsync(couple, cancellationToken);
        }
        catch (Exception ex) when (UniqueConstraint.IsViolation(ex))
        {
            throw new ConflictException("USERNAME_TAKEN", $"'{normalizedUsername}' is already taken.");
        }

        await _auditLogger.LogAsync(
            action: "INVITATION_ACCEPTED",
            isSuccess: true,
            coupleId: couple.Id,
            partnerId: invitee.Id,
            details: $"Together ID: {couple.TogetherID}",
            ipAddress: request.IpAddress ?? _currentUser.IpAddress,
            userAgent: _currentUser.UserAgent,
            cancellationToken: cancellationToken);

        return AuthResult.From(couple, invitee, tokens);
    }
}
