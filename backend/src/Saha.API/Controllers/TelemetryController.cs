using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Saha.Application.Telemetry;

namespace Saha.API.Controllers;

/// <summary>
/// Receives frontend telemetry events and:
/// 1. Logs them as structured Serilog entries (→ Grafana Loki for log exploration).
/// 2. Increments known AuthMetrics counters (→ Grafana Mimir / dashboards).
///
/// The endpoint is anonymous so it can capture pre-login funnel events.
/// All request bodies are validated to prevent PII from being logged.
/// </summary>
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/telemetry")]
public sealed class TelemetryController : ApiControllerBase
{
    /// <summary>
    /// Property keys that must never appear in telemetry payloads (PII guard).
    /// The frontend is designed to never send these, but we scrub defensively.
    /// </summary>
    private static readonly HashSet<string> PiiKeys = new(StringComparer.OrdinalIgnoreCase)
    {
        "username", "email", "password", "phone", "name", "firstname",
        "lastname", "dateofbirth", "dob", "address",
    };

    private readonly AuthMetrics _authMetrics;
    private readonly ILogger<TelemetryController> _logger;

    public TelemetryController(AuthMetrics authMetrics, ILogger<TelemetryController> logger)
    {
        _authMetrics = authMetrics;
        _logger = logger;
    }

    /// <summary>
    /// Ingest a batch of client-side telemetry events from the browser.
    /// Always returns 204 — the frontend must not block on this call.
    /// </summary>
    [HttpPost("events")]
    [AllowAnonymous]
    [EnableRateLimiting("telemetry")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public IActionResult RecordEvents([FromBody] TelemetryBatchRequest request)
    {
        if (request.Events is not { Count: > 0 }) return NoContent();

        // Cap to 50 events per batch to prevent log spam
        var events = request.Events.Take(50);

        foreach (var evt in events)
        {
            if (string.IsNullOrWhiteSpace(evt.Name)) continue;

            var safeProps = SanitizeProperties(evt.Properties);

            // ── Structured log entry (→ Loki) ────────────────────────────
            using var scope = _logger.BeginScope(new Dictionary<string, object?>
            {
                ["FrontendEvent"] = evt.Name,
                ["SessionId"] = evt.SessionId,
                ["AnonymousId"] = evt.AnonymousId,
                ["TraceId"] = evt.TraceId,
                ["FrontendProps"] = safeProps,
            });

            _logger.LogInformation(
                "FrontendEvent {EventName} | Session={SessionId} | Anon={AnonymousId} | Props={@Props}",
                evt.Name, evt.SessionId, evt.AnonymousId, safeProps);

            // ── Increment OTel funnel counter (→ Mimir) ──────────────────
            var platform = safeProps.TryGetValue("platform", out var p) ? p : "web";
            _authMetrics.RecordFrontendFunnelEvent(evt.Name, platform);
        }

        return NoContent();
    }

    private static Dictionary<string, string> SanitizeProperties(
        Dictionary<string, string>? props)
    {
        if (props is null || props.Count == 0) return [];

        return props
            .Where(kvp =>
                !string.IsNullOrWhiteSpace(kvp.Key) &&
                !PiiKeys.Contains(kvp.Key) &&
                kvp.Value.Length <= 512) // Cap value length
            .ToDictionary(kvp => kvp.Key, kvp => kvp.Value);
    }
}

// ── Request DTOs ──────────────────────────────────────────────────────────────

public sealed record TelemetryBatchRequest(List<TelemetryEventRequest>? Events);

/// <summary>
/// A single telemetry event from the browser.
/// Must never contain PII — the controller enforces this via PiiKeys scrubbing.
/// </summary>
public sealed record TelemetryEventRequest(
    /// <summary>Event name (e.g. "auth.login.page_viewed"). Max 128 chars.</summary>
    string Name,

    /// <summary>ISO 8601 timestamp from the client clock.</summary>
    string Timestamp,

    /// <summary>Browser session ID (random UUID, lives in sessionStorage).</summary>
    string SessionId,

    /// <summary>Persistent anonymous user ID (random UUID, lives in localStorage).</summary>
    string? AnonymousId,

    /// <summary>W3C TraceContext trace-id propagated from the browser OTel SDK.</summary>
    string? TraceId,

    /// <summary>Allowed metadata. PII keys are stripped before logging.</summary>
    Dictionary<string, string>? Properties);
