using MediatR;

namespace Saha.Application.Features.Auth.Queries.CheckAvailability;

/// <summary>
/// Backs the wizard's inline checks. Either field may be omitted; the corresponding result is null.
/// </summary>
public sealed record CheckAvailabilityQuery(
    string? Username,
    string? TogetherID) : IRequest<CheckAvailabilityResult>;

/// <summary>Booleans only. Never echo the value back, never say who holds it.</summary>
public sealed record CheckAvailabilityResult(
    bool? UsernameAvailable,
    bool? TogetherIDAvailable);
