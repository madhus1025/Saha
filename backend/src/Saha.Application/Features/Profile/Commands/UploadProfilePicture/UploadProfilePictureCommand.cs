using MediatR;

namespace Saha.Application.Features.Profile.Commands.UploadProfilePicture;

public sealed record UploadProfilePictureCommand(
    Guid CoupleId,
    Guid PartnerId,
    Stream FileStream,
    string FileName,
    string ContentType) : IRequest<UploadProfilePictureResult>;

public sealed record UploadProfilePictureResult(string ProfilePictureUrl);
