using System.Diagnostics;
using System.Diagnostics.Metrics;

namespace Saha.Application.Telemetry;

/// <summary>
/// Authentication metrics instrumentation using the .NET System.Diagnostics.Metrics API.
/// The OpenTelemetry SDK in Saha.API listens to this meter by name and exports measurements
/// to Grafana Cloud (Mimir) without any dependency on OTel packages here.
///
/// Metric naming convention: auth.{action}.{measurement}
/// Dimensions/tags kept minimal to avoid high-cardinality explosions in Mimir.
/// </summary>
public sealed class AuthMetrics
{
    /// <summary>Meter name registered with the OTel SDK via <c>AddMeter(AuthMetrics.MeterName)</c>.</summary>
    public const string MeterName = "Saha.Auth";

    // ── Login ────────────────────────────────────────────────────────────────
    private readonly Counter<long> _loginAttempts;
    private readonly Counter<long> _loginSuccess;
    private readonly Counter<long> _loginFailure;
    private readonly Histogram<double> _loginDurationMs;

    // ── Register ─────────────────────────────────────────────────────────────
    private readonly Counter<long> _registerAttempts;
    private readonly Counter<long> _registerSuccess;
    private readonly Counter<long> _registerFailure;
    private readonly Histogram<double> _registerDurationMs;

    // ── Forgot Password ──────────────────────────────────────────────────────
    private readonly Counter<long> _forgotPasswordRequests;
    private readonly Counter<long> _forgotPasswordSuccess;

    // ── Reset Email ──────────────────────────────────────────────────────────
    private readonly Counter<long> _resetEmailTriggered;
    private readonly Counter<long> _resetEmailSent;
    private readonly Counter<long> _resetEmailFailed;
    private readonly Histogram<double> _resetEmailDurationMs;

    // ── Frontend funnel events (received via /api/v1/telemetry/events) ───────
    private readonly Counter<long> _frontendLoginPageViews;
    private readonly Counter<long> _frontendLoginButtonClicks;
    private readonly Counter<long> _frontendRegisterPageViews;
    private readonly Counter<long> _frontendForgotPasswordClicks;

    public AuthMetrics()
    {
        // Use new Meter() — this singleton lives for the application lifetime.
        // The OTel SDK in Saha.API discovers this meter by name via AddMeter(MeterName).
        var meter = new Meter(MeterName, "1.0.0");

        // Login
        _loginAttempts = meter.CreateCounter<long>(
            "auth.login.attempts",
            unit: "{attempts}",
            description: "Total login attempts (backend received).");

        _loginSuccess = meter.CreateCounter<long>(
            "auth.login.success",
            unit: "{logins}",
            description: "Successful logins.");

        _loginFailure = meter.CreateCounter<long>(
            "auth.login.failure",
            unit: "{failures}",
            description: "Failed logins tagged by error_code.");

        _loginDurationMs = meter.CreateHistogram<double>(
            "auth.login.duration",
            unit: "ms",
            description: "Login request duration in milliseconds.");

        // Register
        _registerAttempts = meter.CreateCounter<long>(
            "auth.register.attempts",
            unit: "{attempts}",
            description: "Total registration attempts.");

        _registerSuccess = meter.CreateCounter<long>(
            "auth.register.success",
            unit: "{registrations}",
            description: "Successful couple registrations.");

        _registerFailure = meter.CreateCounter<long>(
            "auth.register.failure",
            unit: "{failures}",
            description: "Failed couple registrations tagged by error_code.");

        _registerDurationMs = meter.CreateHistogram<double>(
            "auth.register.duration",
            unit: "ms",
            description: "Registration request duration in milliseconds.");

        // Forgot Password
        _forgotPasswordRequests = meter.CreateCounter<long>(
            "auth.forgot_password.requests",
            unit: "{requests}",
            description: "Total forgot-password requests received.");

        _forgotPasswordSuccess = meter.CreateCounter<long>(
            "auth.forgot_password.success",
            unit: "{requests}",
            description: "Forgot-password requests where couple was found and emails triggered.");

        // Reset Email
        _resetEmailTriggered = meter.CreateCounter<long>(
            "auth.reset_email.triggered",
            unit: "{emails}",
            description: "Number of password-reset emails triggered for sending.");

        _resetEmailSent = meter.CreateCounter<long>(
            "auth.reset_email.sent",
            unit: "{emails}",
            description: "Password-reset emails successfully delivered.");

        _resetEmailFailed = meter.CreateCounter<long>(
            "auth.reset_email.failed",
            unit: "{emails}",
            description: "Password-reset emails that failed to send.");

        _resetEmailDurationMs = meter.CreateHistogram<double>(
            "auth.reset_email.duration",
            unit: "ms",
            description: "Time (ms) to send all password-reset emails for one request.");

        // Frontend funnel
        _frontendLoginPageViews = meter.CreateCounter<long>(
            "auth.frontend.login_page.views",
            unit: "{views}",
            description: "Browser: login page opened (top of funnel).");

        _frontendLoginButtonClicks = meter.CreateCounter<long>(
            "auth.frontend.login_button.clicks",
            unit: "{clicks}",
            description: "Browser: login submit button clicked.");

        _frontendRegisterPageViews = meter.CreateCounter<long>(
            "auth.frontend.register_page.views",
            unit: "{views}",
            description: "Browser: registration page opened.");

        _frontendForgotPasswordClicks = meter.CreateCounter<long>(
            "auth.frontend.forgot_password.clicks",
            unit: "{clicks}",
            description: "Browser: forgot-password link clicked.");
    }

    // ── Login recording ──────────────────────────────────────────────────────

    /// <summary>Call once per login attempt, immediately before authentication logic runs.</summary>
    public void RecordLoginAttempt() =>
        _loginAttempts.Add(1);

    /// <summary>Call on successful login, after the access token is issued.</summary>
    public void RecordLoginSuccess(double durationMs)
    {
        _loginSuccess.Add(1);
        _loginDurationMs.Record(durationMs, new TagList { { "outcome", "success" } });
    }

    /// <summary>Call on failed login. <paramref name="errorCode"/> maps to known codes (e.g. INVALID_CREDENTIALS, ACCOUNT_INACTIVE).</summary>
    public void RecordLoginFailure(string errorCode, double durationMs)
    {
        _loginFailure.Add(1, new TagList { { "error_code", errorCode } });
        _loginDurationMs.Record(durationMs, new TagList
        {
            { "outcome", "failure" },
            { "error_code", errorCode },
        });
    }

    // ── Register recording ───────────────────────────────────────────────────

    public void RecordRegisterAttempt() =>
        _registerAttempts.Add(1);

    public void RecordRegisterSuccess(double durationMs)
    {
        _registerSuccess.Add(1);
        _registerDurationMs.Record(durationMs, new TagList { { "outcome", "success" } });
    }

    public void RecordRegisterFailure(string errorCode, double durationMs)
    {
        _registerFailure.Add(1, new TagList { { "error_code", errorCode } });
        _registerDurationMs.Record(durationMs, new TagList
        {
            { "outcome", "failure" },
            { "error_code", errorCode },
        });
    }

    // ── Forgot password recording ────────────────────────────────────────────

    public void RecordForgotPasswordRequest() =>
        _forgotPasswordRequests.Add(1);

    public void RecordForgotPasswordSuccess() =>
        _forgotPasswordSuccess.Add(1);

    // ── Reset email recording ────────────────────────────────────────────────

    /// <summary>Call immediately before calling the email service with <paramref name="emailCount"/> messages.</summary>
    public void RecordResetEmailTriggered(int emailCount) =>
        _resetEmailTriggered.Add(emailCount);

    /// <summary>Call when all reset emails were delivered successfully.</summary>
    public void RecordResetEmailSent(int emailCount, double durationMs)
    {
        _resetEmailSent.Add(emailCount);
        _resetEmailDurationMs.Record(durationMs, new TagList { { "outcome", "success" } });
    }

    /// <summary>Call when the email send operation threw an exception.</summary>
    public void RecordResetEmailFailed(int emailCount, double durationMs)
    {
        _resetEmailFailed.Add(emailCount);
        _resetEmailDurationMs.Record(durationMs, new TagList { { "outcome", "failure" } });
    }

    // ── Frontend funnel recording ────────────────────────────────────────────

    /// <summary>
    /// Called by <see cref="Controllers.TelemetryController"/> when the frontend posts a known
    /// funnel event. Unknown event names are silently ignored (no counter created at runtime).
    /// </summary>
    public void RecordFrontendFunnelEvent(string eventName, string platform)
    {
        var tags = new TagList { { "platform", platform } };

        switch (eventName)
        {
            case FrontendEventNames.LoginPageViewed:
                _frontendLoginPageViews.Add(1, tags);
                break;
            case FrontendEventNames.LoginButtonClicked:
                _frontendLoginButtonClicks.Add(1, tags);
                break;
            case FrontendEventNames.RegisterPageViewed:
                _frontendRegisterPageViews.Add(1, tags);
                break;
            case FrontendEventNames.ForgotPasswordClicked:
                _frontendForgotPasswordClicks.Add(1, tags);
                break;
        }
    }
}

/// <summary>
/// Canonical event names shared between the frontend TypeScript code and the backend C# code.
/// Keep in sync with <c>src/core/telemetry/events.ts</c> on the frontend.
/// </summary>
public static class FrontendEventNames
{
    public const string LoginPageViewed        = "auth.login.page_viewed";
    public const string LoginButtonClicked     = "auth.login.button_clicked";
    public const string RegisterPageViewed     = "auth.register.page_viewed";
    public const string ForgotPasswordClicked  = "auth.forgot_password.clicked";
}
