using MediatR;
using Microsoft.Extensions.Logging;
using Saha.Application.Common.Interfaces;

namespace Saha.Application.Common.Behaviors;

public sealed class PerformanceBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private const int WarningThresholdMs = 500;
    private readonly ILogger<PerformanceBehavior<TRequest, TResponse>> _logger;
    private readonly ICurrentUserContext _currentUser;

    public PerformanceBehavior(
        ILogger<PerformanceBehavior<TRequest, TResponse>> logger,
        ICurrentUserContext currentUser)
    {
        _logger = logger;
        _currentUser = currentUser;
    }

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        var response = await next();
        stopwatch.Stop();

        if (stopwatch.ElapsedMilliseconds > WarningThresholdMs)
        {
            _logger.LogWarning(
                "Long running request detected: {RequestName} ({ElapsedMs}ms) by CoupleId={CoupleId}",
                typeof(TRequest).Name,
                stopwatch.ElapsedMilliseconds,
                _currentUser.IsAuthenticated ? _currentUser.CoupleId : null);
        }

        return response;
    }
}
