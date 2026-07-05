using MediatR;
using Saha.Application.Common.Exceptions;
using Saha.Domain.Interfaces.Repositories;

namespace Saha.Application.Features.Profile.Queries.GetProfile;

public sealed class GetProfileQueryHandler : IRequestHandler<GetProfileQuery, ProfileDto>
{
    private readonly ICoupleRepository _coupleRepository;

    public GetProfileQueryHandler(ICoupleRepository coupleRepository)
    {
        _coupleRepository = coupleRepository;
    }

    public async Task<ProfileDto> Handle(GetProfileQuery request, CancellationToken cancellationToken)
    {
        var couple = await _coupleRepository.GetByIdAsync(request.CoupleId, cancellationToken);

        if (couple is null)
            throw new NotFoundException(nameof(couple), request.CoupleId);

        var partner = couple.GetPartner(request.PartnerId);
        var otherPartner = couple.GetOtherPartner(request.PartnerId);

        return new ProfileDto(
            PartnerId: partner.Id,
            Username: partner.Username,
            Name: partner.Name,
            DateOfBirth: partner.DateOfBirth,
            Email: partner.Email,
            PhoneNumber: partner.PhoneNumber,
            ProfilePictureUrl: partner.ProfilePictureUrl,
            Role: partner.Role.ToString(),
            CoupleInfo: new CoupleInfoDto(
                CoupleId: couple.Id,
                TogetherID: couple.TogetherID,
                Partner: new PartnerSummaryDto(
                    PartnerId: otherPartner.Id,
                    Username: otherPartner.Username,
                    Name: otherPartner.Name,
                    ProfilePictureUrl: otherPartner.ProfilePictureUrl,
                    Role: otherPartner.Role.ToString())));
    }
}
