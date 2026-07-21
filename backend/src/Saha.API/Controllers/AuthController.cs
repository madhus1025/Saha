using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Saha.Application.Common.Interfaces;
using Saha.Application.Features.Auth.Commands.AcceptInvitation;
using Saha.Application.Features.Auth.Commands.CreateInvitation;
using Saha.Application.Features.Auth.Commands.ForgotPassword;
using Saha.Application.Features.Auth.Commands.Login;
using Saha.Application.Features.Auth.Commands.Logout;
using Saha.Application.Features.Auth.Commands.RefreshToken;
using Saha.Application.Features.Auth.Commands.Register;
using Saha.Application.Features.Auth.Commands.ResetPassword;
using Saha.Application.Features.Auth.Common;
using Saha.Application.Features.Auth.Queries.CheckAvailability;
using Saha.Application.Features.Auth.Queries.GetSession;

namespace Saha.API.Controllers;

[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/[controller]")]
public sealed class AuthController : ApiControllerBase
{
    private const string RefreshTokenCookieName = "X-Refresh-Token";
    private const string CookiePath = "/api/v1/auth";

    private readonly ICurrentUserContext _currentUser;

    public AuthController(ICurrentUserContext currentUser) => _currentUser = currentUser;

    [HttpPost("register")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Register(
        [FromBody] RegisterCoupleCommand command,
        CancellationToken cancellationToken)
    {
        var result = await Sender.Send(
            command with { IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString() },
            cancellationToken);

        SetRefreshTokenCookie(result.RefreshToken, result.RefreshTokenExpiresAt);

        return CreatedAtAction(nameof(Register), ToAuthResponse(result));
    }

    /// <summary>Issues an invitation for the second partner. The plain token is returned once.</summary>
    [HttpPost("invitations")]
    [EnableRateLimiting("api")]
    [ProducesResponseType(typeof(CreateInvitationResult), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateInvitation(
        [FromBody] CreateInvitationCommand command,
        CancellationToken cancellationToken)
    {
        var result = await Sender.Send(command, cancellationToken);
        return CreatedAtAction(nameof(CreateInvitation), result);
    }

    [HttpPost("invitations/accept")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> AcceptInvitation(
        [FromBody] AcceptInvitationCommand command,
        CancellationToken cancellationToken)
    {
        var result = await Sender.Send(
            command with { IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString() },
            cancellationToken);

        SetRefreshTokenCookie(result.RefreshToken, result.RefreshTokenExpiresAt);

        return Ok(ToAuthResponse(result));
    }

    /// <summary>Boolean-only availability check for the registration wizard. See OQ-1.</summary>
    [HttpGet("availability")]
    [AllowAnonymous]
    [EnableRateLimiting("availability")]
    [ProducesResponseType(typeof(CheckAvailabilityResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CheckAvailability(
        [FromQuery] string? username,
        [FromQuery] string? togetherId,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(username) && string.IsNullOrWhiteSpace(togetherId))
            return BadRequest(new { code = "NOTHING_TO_CHECK", message = "Provide a username or a togetherId." });

        var result = await Sender.Send(new CheckAvailabilityQuery(username, togetherId), cancellationToken);
        return Ok(result);
    }

    /// <summary>The caller's live couple state — read from the couple, not the access token.</summary>
    [HttpGet("session")]
    [EnableRateLimiting("api")]
    [ProducesResponseType(typeof(SessionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetSession(CancellationToken cancellationToken)
    {
        var result = await Sender.Send(
            new GetSessionQuery(_currentUser.CoupleId, _currentUser.PartnerId), cancellationToken);

        return Ok(result);
    }

    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login(
        [FromBody] LoginRequest request,
        CancellationToken cancellationToken)
    {
        var command = new LoginCommand(
            request.Username,
            request.Password,
            HttpContext.Connection.RemoteIpAddress?.ToString());

        var result = await Sender.Send(command, cancellationToken);

        SetRefreshTokenCookie(result.RefreshToken, result.RefreshTokenExpiresAt);

        return Ok(ToAuthResponse(result));
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(RefreshResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Refresh(CancellationToken cancellationToken)
    {
        var refreshToken = Request.Cookies[RefreshTokenCookieName];

        if (string.IsNullOrWhiteSpace(refreshToken))
            return Unauthorized(new { message = "Refresh token not found." });

        var command = new RefreshTokenCommand(
            refreshToken,
            HttpContext.Connection.RemoteIpAddress?.ToString());

        var result = await Sender.Send(command, cancellationToken);

        SetRefreshTokenCookie(result.RefreshToken, result.RefreshTokenExpiresAt);

        return Ok(new RefreshResponseDto(result.AccessToken, result.AccessTokenExpiresAt));
    }

    [HttpPost("forgot-password")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> ForgotPassword(
        [FromBody] ForgotPasswordRequest request,
        CancellationToken cancellationToken)
    {
        await Sender.Send(new ForgotPasswordCommand(request.TogetherIDOrUsername), cancellationToken);
        return NoContent();
    }

    [HttpPost("reset-password")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> ResetPassword(
        [FromBody] ResetPasswordCommand command,
        CancellationToken cancellationToken)
    {
        await Sender.Send(command, cancellationToken);
        return NoContent();
    }

    [HttpPost("logout")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Logout(CancellationToken cancellationToken)
    {
        var refreshToken = Request.Cookies[RefreshTokenCookieName] ?? string.Empty;
        await Sender.Send(new LogoutCommand(refreshToken), cancellationToken);

        Response.Cookies.Delete(RefreshTokenCookieName, new CookieOptions { Path = CookiePath });
        return NoContent();
    }

    private static AuthResponseDto ToAuthResponse(AuthResult result) => new(
        result.AccessToken,
        result.AccessTokenExpiresAt,
        result.CoupleId,
        result.PartnerId,
        result.Username,
        result.PartnerName,
        result.TogetherID,
        result.Role,
        result.ProfilePictureUrl,
        result.CoupleState);

    private void SetRefreshTokenCookie(string refreshToken, DateTime expires)
    {
        Response.Cookies.Append(RefreshTokenCookieName, refreshToken, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Strict,
            Expires = expires,
            Path = CookiePath
        });
    }
}

public sealed record LoginRequest(string Username, string Password);
public sealed record ForgotPasswordRequest(string TogetherIDOrUsername);

/// <summary>Returned by login, registration, and invitation acceptance alike.</summary>
public sealed record AuthResponseDto(
    string AccessToken,
    DateTime ExpiresAt,
    Guid CoupleId,
    Guid PartnerId,
    string Username,
    string PartnerName,
    string TogetherID,
    string Role,
    string? ProfilePictureUrl,
    string CoupleState);

public sealed record RefreshResponseDto(string AccessToken, DateTime ExpiresAt);
