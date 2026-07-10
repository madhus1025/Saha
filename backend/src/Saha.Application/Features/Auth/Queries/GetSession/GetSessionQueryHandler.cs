using MediatR;
using Saha.Application.Common.Exceptions;
using Saha.Domain.Interfaces.Repositories;

namespace Saha.Application.Features.Auth.Queries.GetSession;

public sealed class GetSessionQueryHandler : IRequestHandler<GetSessionQuery, SessionDto>
{
    private readonly ICoupleRepository _coupleRepository;

    public GetSessionQueryHandler(ICoupleRepository coupleRepository)
    {
        _coupleRepository = coupleRepository;
    }

    public async Task<SessionDto> Handle(GetSessionQuery request, CancellationToken cancellationToken)
    {
        var couple = await _coupleRepository.GetByIdAsync(request.CoupleId, cancellationToken);
        if (couple is null)
            throw new NotFoundException("Couple", request.CoupleId);

        var partner = couple.GetPartner(request.PartnerId);

        return new SessionDto(
            CoupleId: couple.Id,
            PartnerId: partner.Id,
            Username: partner.Username,
            PartnerName: partner.Name,
            TogetherID: couple.TogetherID,
            Role: partner.Role.ToString(),
            ProfilePictureUrl: partner.ProfilePictureUrl,
            CoupleState: couple.State.ToString());
    }
}
