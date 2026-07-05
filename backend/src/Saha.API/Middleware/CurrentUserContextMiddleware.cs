using System.Security.Claims;
using Saha.Application.Common.Interfaces;

namespace Saha.API.Middleware;

public sealed class CurrentUserContextMiddleware
{
    private readonly RequestDelegate _next;

    public CurrentUserContextMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        await _next(context);
    }
}

public sealed class HttpCurrentUserContext : ICurrentUserContext
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public HttpCurrentUserContext(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    private ClaimsPrincipal? User => _httpContextAccessor.HttpContext?.User;

    public bool IsAuthenticated => User?.Identity?.IsAuthenticated ?? false;

    public Guid CoupleId => IsAuthenticated
        ? Guid.Parse(User!.FindFirstValue("coupleId") ?? Guid.Empty.ToString())
        : Guid.Empty;

    public Guid PartnerId => IsAuthenticated
        ? Guid.Parse(User!.FindFirstValue("partnerId") ?? Guid.Empty.ToString())
        : Guid.Empty;

    public string Username => User?.FindFirstValue("username") ?? string.Empty;
    public string TogetherID => User?.FindFirstValue("togetherId") ?? string.Empty;
    public string Role => User?.FindFirstValue("role") ?? string.Empty;

    public string? IpAddress =>
        _httpContextAccessor.HttpContext?.Connection.RemoteIpAddress?.ToString();

    public string? UserAgent =>
        _httpContextAccessor.HttpContext?.Request.Headers.UserAgent.ToString();
}
