using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Saha.Application.Features.Auth.Commands.ForgotPassword;
using Saha.Application.Features.Auth.Commands.Login;
using Saha.Application.Features.Auth.Commands.Logout;
using Saha.Application.Features.Auth.Commands.RefreshToken;
using Saha.Application.Features.Auth.Commands.Register;
using Saha.Application.Features.Auth.Commands.ResetPassword;

namespace Saha.API.Controllers;

[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/[controller]")]
public sealed class AuthController : ApiControllerBase
{
    private const string RefreshTokenCookieName = "X-Refresh-Token";
    private const string CookiePath = "/api/v1/auth";

    [HttpPost("register")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    [ProducesResponseType(typeof(RegisterCoupleResult), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Register(
        [FromBody] RegisterCoupleCommand command,
        CancellationToken cancellationToken)
    {
        var result = await Sender.Send(command, cancellationToken);
        return CreatedAtAction(nameof(Register), result);
    }

    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    [ProducesResponseType(typeof(LoginResponseDto), StatusCodes.Status200OK)]
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

        return Ok(new LoginResponseDto(
            result.AccessToken,
            result.AccessTokenExpiresAt,
            result.CoupleId,
            result.PartnerId,
            result.Username,
            result.PartnerName,
            result.TogetherID,
            result.Role,
            result.ProfilePictureUrl));
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

public sealed record LoginResponseDto(
    string AccessToken,
    DateTime ExpiresAt,
    Guid CoupleId,
    Guid PartnerId,
    string Username,
    string PartnerName,
    string TogetherID,
    string Role,
    string? ProfilePictureUrl);

public sealed record RefreshResponseDto(string AccessToken, DateTime ExpiresAt);
