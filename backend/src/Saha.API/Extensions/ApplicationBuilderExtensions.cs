namespace Saha.API.Extensions;

public static class ApplicationBuilderExtensions
{
    public static IApplicationBuilder UseSecurityHeaders(this IApplicationBuilder app)
    {
        return app.Use(async (context, next) =>
        {
            context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
            context.Response.Headers.Append("X-Frame-Options", "DENY");
            context.Response.Headers.Append("X-XSS-Protection", "1; mode=block");
            context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
            context.Response.Headers.Append("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
            context.Response.Headers.Append(
                "Content-Security-Policy",
                "default-src 'self'; img-src 'self' https://sahablob.blob.core.windows.net data:; " +
                "script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self';");
            await next();
        });
    }
}
