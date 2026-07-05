using MediatR;
using Saha.Application.Common.Exceptions;
using Saha.Application.Common.Interfaces;
using Saha.Domain.Interfaces.Repositories;

namespace Saha.Application.Features.Profile.Commands.UpdateProfile;

public sealed class UpdateProfileCommandHandler : IRequestHandler<UpdateProfileCommand>
{
    private readonly ICoupleRepository _coupleRepository;
    private readonly IAuditLogger _auditLogger;
    private readonly ICurrentUserContext _currentUser;

    public UpdateProfileCommandHandler(
        ICoupleRepository coupleRepository,
        IAuditLogger auditLogger,
        ICurrentUserContext currentUser)
    {
        _coupleRepository = coupleRepository;
        _auditLogger = auditLogger;
        _currentUser = currentUser;
    }

    public async Task Handle(UpdateProfileCommand request, CancellationToken cancellationToken)
    {
        var couple = await _coupleRepository.GetByIdAsync(request.CoupleId, cancellationToken);

        if (couple is null)
            throw new NotFoundException(nameof(couple), request.CoupleId);

        if (_currentUser.CoupleId != request.CoupleId)
            throw new ForbiddenException("Cannot update another couple's profile.");

        if (_currentUser.PartnerId != request.PartnerId)
            throw new ForbiddenException("Cannot update your partner's profile.");

        var partner = couple.GetPartner(request.PartnerId);

        partner.UpdateProfile(request.Name, request.DateOfBirth, request.Email, request.PhoneNumber);

        await _coupleRepository.UpdateAsync(couple, cancellationToken);

        await _auditLogger.LogAsync(
            action: "PROFILE_UPDATED",
            isSuccess: true,
            coupleId: couple.Id,
            partnerId: partner.Id,
            resourceType: "Partner",
            resourceId: partner.Id,
            ipAddress: _currentUser.IpAddress,
            cancellationToken: cancellationToken);
    }
}
