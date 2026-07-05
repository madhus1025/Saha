using System.Net;
using System.Text.Json;
using Saha.Application.Common.Exceptions;
using Saha.Domain.Exceptions;

namespace Saha.API.Middleware;

public sealed class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var (statusCode, response) = exception switch
        {
            ApplicationValidationException validationEx => (
                HttpStatusCode.BadRequest,
                new ErrorResponse("VALIDATION_ERROR", "One or more validation errors occurred.", validationEx.Errors)),

            NotFoundException notFoundEx => (
                HttpStatusCode.NotFound,
                new ErrorResponse("NOT_FOUND", notFoundEx.Message, null)),

            UnauthorizedException unauthorizedEx => (
                HttpStatusCode.Unauthorized,
                new ErrorResponse("UNAUTHORIZED", unauthorizedEx.Message, null)),

            ForbiddenException forbiddenEx => (
                HttpStatusCode.Forbidden,
                new ErrorResponse("FORBIDDEN", forbiddenEx.Message, null)),

            ConflictException conflictEx => (
                HttpStatusCode.Conflict,
                new ErrorResponse(conflictEx.ConflictCode, conflictEx.Message, null)),

            DomainValidationException domainValidationEx => (
                HttpStatusCode.BadRequest,
                new ErrorResponse("DOMAIN_VALIDATION_ERROR", domainValidationEx.Message,
                    new Dictionary<string, string[]>
                    {
                        { domainValidationEx.PropertyName, [domainValidationEx.Message] }
                    })),

            DomainException domainEx => (
                HttpStatusCode.BadRequest,
                new ErrorResponse(domainEx.Code, domainEx.Message, null)),

            _ => (
                HttpStatusCode.InternalServerError,
                new ErrorResponse("INTERNAL_ERROR", "An unexpected error occurred.", null))
        };

        if ((int)statusCode >= 500)
            _logger.LogError(exception, "Unhandled exception: {Message}", exception.Message);
        else
            _logger.LogWarning(exception, "Handled exception: {Message}", exception.Message);

        context.Response.StatusCode = (int)statusCode;
        context.Response.ContentType = "application/json";

        var json = JsonSerializer.Serialize(response, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        await context.Response.WriteAsync(json);
    }
}

public sealed record ErrorResponse(
    string Code,
    string Message,
    IReadOnlyDictionary<string, string[]>? Errors);
