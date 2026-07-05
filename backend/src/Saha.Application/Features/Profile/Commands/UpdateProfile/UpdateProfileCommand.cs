using MediatR;

namespace Saha.Application.Features.Profile.Commands.UpdateProfile;

public sealed record UpdateProfileCommand(
    Guid CoupleId,
    Guid PartnerId,
    string Name,
    DateTime DateOfBirth,
    string Email,
    string PhoneNumber) : IRequest;
