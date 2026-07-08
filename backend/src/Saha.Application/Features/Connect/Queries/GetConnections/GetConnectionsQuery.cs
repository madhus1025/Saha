using MediatR;
using Saha.Domain.Enums;

namespace Saha.Application.Features.Connect.Queries.GetConnections;

public sealed record GetConnectionsQuery(
    Guid CoupleId,
    ConnectionRequestStatus? Status = null) : IRequest<IReadOnlyList<ConnectionDto>>;

public sealed record ConnectionDto(
    Guid ConnectionId,
    Guid CoupleId,
    string TogetherID,
    string HusbandName,
    string WifeName,
    string? HusbandProfilePictureUrl,
    string? WifeProfilePictureUrl,
    string Status,
    bool IsInitiator,
    DateTime CreatedAt,
    DateTime? AcceptedAt);
