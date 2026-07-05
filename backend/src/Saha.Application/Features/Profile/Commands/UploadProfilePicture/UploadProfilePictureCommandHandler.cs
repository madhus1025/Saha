using MediatR;
using Microsoft.Extensions.Configuration;
using Saha.Application.Common.Exceptions;
using Saha.Application.Common.Interfaces;
using Saha.Domain.Interfaces.Repositories;

namespace Saha.Application.Features.Profile.Commands.UploadProfilePicture;

public sealed class UploadProfilePictureCommandHandler
    : IRequestHandler<UploadProfilePictureCommand, UploadProfilePictureResult>
{
    private static readonly HashSet<string> AllowedContentTypes =
        ["image/jpeg", "image/png", "image/webp", "image/gif"];
    private const long MaxFileSizeBytes = 5 * 1024 * 1024; // 5 MB

    private readonly ICoupleRepository _coupleRepository;
    private readonly IBlobStorageService _blobStorageService;
    private readonly IAuditLogger _auditLogger;
    private readonly ICurrentUserContext _currentUser;
    private readonly IConfiguration _configuration;

    public UploadProfilePictureCommandHandler(
        ICoupleRepository coupleRepository,
        IBlobStorageService blobStorageService,
        IAuditLogger auditLogger,
        ICurrentUserContext currentUser,
        IConfiguration configuration)
    {
        _coupleRepository = coupleRepository;
        _blobStorageService = blobStorageService;
        _auditLogger = auditLogger;
        _currentUser = currentUser;
        _configuration = configuration;
    }

    public async Task<UploadProfilePictureResult> Handle(
        UploadProfilePictureCommand request,
        CancellationToken cancellationToken)
    {
        if (_currentUser.CoupleId != request.CoupleId || _currentUser.PartnerId != request.PartnerId)
            throw new ForbiddenException("Cannot upload profile picture for another partner.");

        if (!AllowedContentTypes.Contains(request.ContentType.ToLowerInvariant()))
            throw new ApplicationValidationException(new Dictionary<string, string[]>
            {
                { "file", ["Only JPEG, PNG, WebP, and GIF images are allowed."] }
            });

        if (request.FileStream.Length > MaxFileSizeBytes)
            throw new ApplicationValidationException(new Dictionary<string, string[]>
            {
                { "file", ["File size cannot exceed 5 MB."] }
            });

        var couple = await _coupleRepository.GetByIdAsync(request.CoupleId, cancellationToken);
        if (couple is null) throw new NotFoundException(nameof(couple), request.CoupleId);

        var partner = couple.GetPartner(request.PartnerId);
        var containerName = _configuration["AzureStorage:ProfilePicturesContainer"] ?? "profile-pictures";

        if (partner.ProfilePictureUrl is not null)
        {
            await _blobStorageService.DeleteAsync(partner.ProfilePictureUrl, containerName, cancellationToken);
        }

        var extension = Path.GetExtension(request.FileName);
        var blobName = $"{request.CoupleId}/{request.PartnerId}/{Guid.NewGuid()}{extension}";

        var url = await _blobStorageService.UploadAsync(
            request.FileStream, blobName, request.ContentType, containerName, cancellationToken);

        partner.SetProfilePictureUrl(url);
        await _coupleRepository.UpdateAsync(couple, cancellationToken);

        await _auditLogger.LogAsync(
            action: "PROFILE_PICTURE_UPLOADED",
            isSuccess: true,
            coupleId: couple.Id,
            partnerId: partner.Id,
            ipAddress: _currentUser.IpAddress,
            cancellationToken: cancellationToken);

        return new UploadProfilePictureResult(url);
    }
}
