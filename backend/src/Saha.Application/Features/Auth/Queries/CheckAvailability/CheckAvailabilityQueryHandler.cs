using MediatR;
using Saha.Domain.Interfaces.Repositories;

namespace Saha.Application.Features.Auth.Queries.CheckAvailability;

/// <summary>
/// An enumeration oracle by construction — you cannot report "taken" without disclosing existence.
/// TogetherIDs are public by design; usernames are not, so this is a deliberate, product-approved
/// disclosure (OQ-1). It is mitigated by the "availability" rate limiter and by returning nothing
/// but a boolean. Login remains uniform, so this is the only username-enumeration vector.
/// </summary>
public sealed class CheckAvailabilityQueryHandler
    : IRequestHandler<CheckAvailabilityQuery, CheckAvailabilityResult>
{
    private readonly ICoupleRepository _coupleRepository;

    public CheckAvailabilityQueryHandler(ICoupleRepository coupleRepository)
    {
        _coupleRepository = coupleRepository;
    }

    public async Task<CheckAvailabilityResult> Handle(
        CheckAvailabilityQuery request,
        CancellationToken cancellationToken)
    {
        bool? usernameAvailable = null;
        bool? togetherIdAvailable = null;

        if (!string.IsNullOrWhiteSpace(request.Username))
        {
            usernameAvailable = !await _coupleRepository.ExistsByUsernameAsync(
                request.Username.Trim().ToLowerInvariant(), cancellationToken);
        }

        if (!string.IsNullOrWhiteSpace(request.TogetherID))
        {
            togetherIdAvailable = !await _coupleRepository.ExistsByTogetherIDAsync(
                request.TogetherID.Trim().ToUpperInvariant(), cancellationToken);
        }

        return new CheckAvailabilityResult(usernameAvailable, togetherIdAvailable);
    }
}
