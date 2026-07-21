using MediatR;
using Microsoft.Extensions.Configuration;
using Saha.Application.Common.Exceptions;
using Saha.Application.Common.Interfaces;
using Saha.Domain.Interfaces.Repositories;

namespace Saha.Application.Features.Auth.Commands.CreateInvitation;

public sealed class CreateInvitationCommandHandler
    : IRequestHandler<CreateInvitationCommand, CreateInvitationResult>
{
    private const int DefaultTokenTtlHours = 168; // 7 days

    private readonly ICoupleRepository _coupleRepository;
    private readonly ITokenService _tokenService;
    private readonly IAuditLogger _auditLogger;
    private readonly ICurrentUserContext _currentUser;
    private readonly IConfiguration _configuration;

    public CreateInvitationCommandHandler(
        ICoupleRepository coupleRepository,
        ITokenService tokenService,
        IAuditLogger auditLogger,
        ICurrentUserContext currentUser,
        IConfiguration configuration)
    {
        _coupleRepository = coupleRepository;
        _tokenService = tokenService;
        _auditLogger = auditLogger;
        _currentUser = currentUser;
        _configuration = configuration;
    }

    public async Task<CreateInvitationResult> Handle(
        CreateInvitationCommand request,
        CancellationToken cancellationToken)
    {
        var coupleId = _currentUser.CoupleId;

        var couple = await _coupleRepository.GetByIdAsync(coupleId, cancellationToken);
        if (couple is null)
            throw new NotFoundException("Couple", coupleId);

        if (couple.IsComplete)
            throw new ConflictException("COUPLE_ALREADY_COMPLETE", "This home already has both partners.");

        var ttlHours = _configuration.GetValue("Invitation:TokenTtlHours", DefaultTokenTtlHours);

        // 512 bits of entropy from the same CSPRNG that mints refresh tokens; stored only as a hash.
        var token = _tokenService.GenerateRefreshToken();
        var tokenHash = _tokenService.HashToken(token);

        var invitation = couple.CreateInvitation(
            request.InviteeName,
            request.InviteeEmail,
            tokenHash,
            DateTime.UtcNow.AddHours(ttlHours));

        await _coupleRepository.UpdateAsync(couple, cancellationToken);

        await _auditLogger.LogAsync(
            action: "INVITATION_CREATED",
            isSuccess: true,
            coupleId: couple.Id,
            partnerId: _currentUser.PartnerId,
            details: $"Invitation {invitation.Id}",
            ipAddress: _currentUser.IpAddress,
            userAgent: _currentUser.UserAgent,
            cancellationToken: cancellationToken);

        return new CreateInvitationResult(invitation.Id, token, invitation.ExpiresAt);
    }
}
