using Asp.Versioning;
using Microsoft.AspNetCore.Mvc;
using Saha.Application.Common.Interfaces;
using Saha.Application.Features.Profile.Commands.UpdateProfile;
using Saha.Application.Features.Profile.Commands.UploadProfilePicture;
using Saha.Application.Features.Profile.Queries.GetProfile;

namespace Saha.API.Controllers;

[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/[controller]")]
public sealed class ProfileController : ApiControllerBase
{
    private readonly ICurrentUserContext _currentUser;

    public ProfileController(ICurrentUserContext currentUser)
    {
        _currentUser = currentUser;
    }

    [HttpGet("me")]
    [ProducesResponseType(typeof(ProfileDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetMyProfile(CancellationToken cancellationToken)
    {
        var query = new GetProfileQuery(_currentUser.CoupleId, _currentUser.PartnerId);
        var result = await Sender.Send(query, cancellationToken);
        return Ok(result);
    }

    [HttpGet("partner")]
    [ProducesResponseType(typeof(ProfileDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetPartnerProfile(CancellationToken cancellationToken)
    {
        // We get the couple and return the OTHER partner's profile
        var myProfile = await Sender.Send(
            new GetProfileQuery(_currentUser.CoupleId, _currentUser.PartnerId), cancellationToken);

        // The partner's profile is embedded in CoupleInfo
        var partnerQuery = new GetProfileQuery(
            _currentUser.CoupleId, myProfile.CoupleInfo.Partner.PartnerId);

        var result = await Sender.Send(partnerQuery, cancellationToken);
        return Ok(result);
    }

    [HttpPut("me")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> UpdateProfile(
        [FromBody] UpdateProfileRequest request,
        CancellationToken cancellationToken)
    {
        var command = new UpdateProfileCommand(
            _currentUser.CoupleId,
            _currentUser.PartnerId,
            request.Name,
            request.DateOfBirth,
            request.Email,
            request.PhoneNumber);

        await Sender.Send(command, cancellationToken);
        return NoContent();
    }

    [HttpPost("me/picture")]
    [RequestSizeLimit(5_242_880)]
    [ProducesResponseType(typeof(UploadProfilePictureResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> UploadProfilePicture(
        IFormFile file,
        CancellationToken cancellationToken)
    {
        var command = new UploadProfilePictureCommand(
            _currentUser.CoupleId,
            _currentUser.PartnerId,
            file.OpenReadStream(),
            file.FileName,
            file.ContentType);

        var result = await Sender.Send(command, cancellationToken);
        return Ok(result);
    }
}

public sealed record UpdateProfileRequest(
    string Name,
    DateTime DateOfBirth,
    string Email,
    string PhoneNumber);
