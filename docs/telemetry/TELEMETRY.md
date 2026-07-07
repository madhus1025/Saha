# Telemetry & Observability Guide

This document describes the end-to-end observability stack for Saha.
All telemetry targets **Grafana Cloud** (Mimir for metrics, Loki for logs, Tempo for traces).

---

## Architecture Overview

```
Browser (React)                    Backend (.NET 9)               Grafana Cloud
────────────────                   ─────────────────              ─────────────
Page view / click                  AspNetCore OTel SDK ──traces──▶ Grafana Tempo
     │                             AuthMetrics (counters)  ┐
     │  traceparent header         HttpClient OTel SDK     ├metrics▶ Grafana Mimir
     ▼                             LoginCommandHandler     │
POST /api/v1/telemetry/events      RegisterCommandHandler  ┘
     │                             ForgotPasswordHandler
     ▼                                    │
TelemetryController                Serilog ──────────────logs────▶ Grafana Loki
  → log via Serilog
  → increment AuthMetrics
```

---

## What Is Collected

### Backend Metrics (OTel → Grafana Mimir)

| Metric Name | Type | Tags | Description |
|---|---|---|---|
| `auth.login.attempts` | Counter | — | Login requests received |
| `auth.login.success` | Counter | — | Successful logins |
| `auth.login.failure` | Counter | `error_code` | Failed logins |
| `auth.login.duration` | Histogram | `outcome`, `error_code` | ms |
| `auth.register.attempts` | Counter | — | Registration requests |
| `auth.register.success` | Counter | — | Successful registrations |
| `auth.register.failure` | Counter | `error_code` | Failed registrations |
| `auth.register.duration` | Histogram | `outcome`, `error_code` | ms |
| `auth.forgot_password.requests` | Counter | — | Forgot-password requests |
| `auth.forgot_password.success` | Counter | — | Couple found + emails triggered |
| `auth.reset_email.triggered` | Counter | — | Emails triggered for send |
| `auth.reset_email.sent` | Counter | — | Emails delivered successfully |
| `auth.reset_email.failed` | Counter | — | Email delivery failures |
| `auth.reset_email.duration` | Histogram | `outcome` | ms to send all emails |
| `auth.frontend.login_page.views` | Counter | `platform` | Browser: login page opened |
| `auth.frontend.login_button.clicks` | Counter | `platform` | Browser: submit clicked |
| `auth.frontend.register_page.views` | Counter | `platform` | Browser: register page opened |
| `auth.frontend.forgot_password.clicks` | Counter | `platform` | Browser: forgot-password clicked |

**HTTP metrics** (via ASP.NET Core OTel instrumentation):

| Metric | Description |
|---|---|
| `http.server.request.duration` | Per-endpoint request latency histogram |
| `http.server.active_requests` | Current in-flight requests |
| `http.client.request.duration` | Outbound HTTP call latency (e.g. email SMTP) |

---

### Backend Traces (OTel → Grafana Tempo)

Every inbound HTTP request generates a span with:
- `traceparent` header forwarded from the frontend (links browser → backend trace)
- Exception details recorded on failed spans
- HTTP status code, method, route

---

### Backend Logs (Serilog → Grafana Loki)

All Serilog output is shipped to Loki with these labels:

| Label | Value |
|---|---|
| `service_name` | `saha-api` |
| `environment` | `Development` / `Production` |
| `MachineName` | Server hostname |

Key structured log entries:

| Template | Where | Notes |
|---|---|---|
| `"Handling {RequestName}"` | `LoggingBehavior` | Start of every MediatR command |
| `"Handled {RequestName} in {ElapsedMs}ms"` | `LoggingBehavior` | Handler duration |
| `"FrontendEvent {EventName}"` | `TelemetryController` | Browser events |
| `"Email sent to {To}"` | `SmtpEmailService` | Successful SMTP delivery |
| `"Failed to send email to {To}"` | `SmtpEmailService` | SMTP failure |
| `"Failed to send password-reset emails…"` | `ForgotPasswordCommandHandler` | Email batch failure |

---

### Frontend Events (POST → TelemetryController → Loki + Mimir)

| Event Name | Fired When | Attached Properties |
|---|---|---|
| `auth.login.page_viewed` | Login page mounts | `environment`, `platform`, `browser`, `device_type`, `app_version` |
| `auth.login.button_clicked` | Login submit called | + `partner_id` (if already identified) |
| `auth.register.page_viewed` | Register page mounts | Same base |
| `auth.forgot_password.clicked` | Forgot-password mutation fires | Same base |

**No PII is ever included.** The backend scrubs `username`, `email`, `password`, `name`, `phone`, `dateofbirth` from any event properties before logging.

---

## Configuration

### Backend — `appsettings.json`

```json
{
  "Grafana": {
    "OtlpEndpoint": "https://otlp-gateway-prod-us-east-0.grafana.net/otlp",
    "OtlpHeaders":  "Authorization=Basic <base64(stackId:apiToken)>",
    "LokiUri":      "https://logs-prod-us-east-0.grafana.net",
    "LokiLogin":    "<stackId>",
    "LokiPassword": "<apiToken>"
  }
}
```

Obtain credentials from **Grafana Cloud → Your Stack → Details → Connections → OTLP**.

- `OtlpHeaders` format: `Authorization=Basic ` + `base64(stackId:apiToken)` (one string)
- `LokiLogin` is the **numeric stack ID** (e.g. `123456`)
- `LokiPassword` is the Grafana Cloud API token with `MetricsPublisher` + `LogsPublisher` scopes

> When `OtlpEndpoint` is empty, OTel is silently skipped (no crash, no export).
> When `LokiUri` is empty, the Loki sink is silently skipped.

### Frontend — `.env.local`

```dotenv
VITE_APP_VERSION=1.0.0
VITE_APP_ENV=production
VITE_OTEL_ENABLED=true
```

---

## Distributed Trace Correlation

Every Axios request carries a `traceparent` header generated by `src/core/telemetry/otel.ts`.
The header follows the **W3C Trace Context** spec (`00-{traceId}-{spanId}-01`).

The backend's `OpenTelemetry.Instrumentation.AspNetCore` automatically reads this header
and sets the incoming span's parent trace ID accordingly. This means:

1. A login attempt in the browser → `auth.login.button_clicked` event contains `traceId: X`
2. The axios call to `POST /api/v1/auth/login` carries `traceparent: 00-X-...`
3. The backend span in Grafana Tempo is tagged with trace ID `X`
4. In Grafana Explore, searching Loki for the trace ID shows both frontend and backend logs
5. In Grafana Tempo, clicking the trace shows the full request waterfall

---

## Grafana Dashboard Setup

### Authentication Funnel Dashboard

Create a new dashboard in Grafana with the panels below.
All queries target the **Grafana Cloud Mimir** data source (Prometheus-compatible).

#### Panel 1 — Login Funnel

```promql
# Page opened (frontend)
sum(increase(auth_frontend_login_page_views_total[$__range]))

# Submit clicked (frontend)
sum(increase(auth_frontend_login_button_clicks_total[$__range]))

# Backend attempts
sum(increase(auth_login_attempts_total[$__range]))

# Successful logins
sum(increase(auth_login_success_total[$__range]))

# Failed logins
sum(increase(auth_login_failure_total[$__range]))
```

Use a **Stat** panel for each value, or a **Bar gauge** for the funnel comparison.

#### Panel 2 — Login Failure Reasons

```promql
topk(5, sum by (error_code) (increase(auth_login_failure_total[$__range])))
```

Visualise as **Bar chart** or **Pie chart**.

#### Panel 3 — Login API Latency (P50 / P95 / P99 / Max)

```promql
histogram_quantile(0.50, sum(rate(auth_login_duration_bucket[$__rate_interval])) by (le))
histogram_quantile(0.95, sum(rate(auth_login_duration_bucket[$__rate_interval])) by (le))
histogram_quantile(0.99, sum(rate(auth_login_duration_bucket[$__rate_interval])) by (le))
histogram_quantile(1.00, sum(rate(auth_login_duration_bucket[$__rate_interval])) by (le))
```

Visualise as **Time series**.

#### Panel 4 — Registration Funnel

```promql
sum(increase(auth_frontend_register_page_views_total[$__range]))
sum(increase(auth_register_attempts_total[$__range]))
sum(increase(auth_register_success_total[$__range]))
sum(increase(auth_register_failure_total[$__range]))
```

#### Panel 5 — Registration Failure Reasons

```promql
topk(5, sum by (error_code) (increase(auth_register_failure_total[$__range])))
```

#### Panel 6 — Registration Latency

```promql
histogram_quantile(0.50, sum(rate(auth_register_duration_bucket[$__rate_interval])) by (le))
histogram_quantile(0.95, sum(rate(auth_register_duration_bucket[$__rate_interval])) by (le))
histogram_quantile(0.99, sum(rate(auth_register_duration_bucket[$__rate_interval])) by (le))
```

#### Panel 7 — Forgot Password Funnel

```promql
sum(increase(auth_frontend_forgot_password_clicks_total[$__range]))
sum(increase(auth_forgot_password_requests_total[$__range]))
sum(increase(auth_forgot_password_success_total[$__range]))
sum(increase(auth_reset_email_triggered_total[$__range]))
sum(increase(auth_reset_email_sent_total[$__range]))
sum(increase(auth_reset_email_failed_total[$__range]))
```

#### Panel 8 — Email Send Latency

```promql
histogram_quantile(0.50, sum(rate(auth_reset_email_duration_bucket[$__rate_interval])) by (le))
histogram_quantile(0.95, sum(rate(auth_reset_email_duration_bucket[$__rate_interval])) by (le))
histogram_quantile(0.99, sum(rate(auth_reset_email_duration_bucket[$__rate_interval])) by (le))
```

#### Panel 9 — HTTP Request Latency (all endpoints)

```promql
histogram_quantile(0.99, sum(rate(http_server_request_duration_seconds_bucket{http_route=~".*auth.*"}[$__rate_interval])) by (http_route, le))
```

#### Panel 10 — Error Rate Over Time

```promql
sum(rate(http_server_request_duration_seconds_count{http_response_status_code=~"4..|5.."}[$__rate_interval]))
/
sum(rate(http_server_request_duration_seconds_count[$__rate_interval]))
```

---

### Log Exploration (Grafana Loki)

In **Grafana → Explore → Loki data source**:

```logql
# All auth-related backend logs
{service_name="saha-api"} |= "auth"

# Frontend events only
{service_name="saha-api"} | json | FrontendEvent != ""

# Trace all events for a specific trace ID
{service_name="saha-api"} |= "00-abc123..."

# Login failures
{service_name="saha-api"} |= "LOGIN_FAILED"

# Email failures
{service_name="saha-api"} |= "Failed to send" |= "email"
```

---

## PII Policy

**Nothing that can identify an individual is ever logged or sent as a metric tag.**

| Data | Handled How |
|---|---|
| Username | Used in audit log (DB only), never in OTel or Loki |
| Email address | Used in SMTP delivery log (`{To}` masked in prod), never in metrics |
| Password | Never appears anywhere beyond the bcrypt hash path |
| IP Address | In audit log (DB) only |
| Partner ID (UUID) | May appear in telemetry events as a non-reversible internal ID |
| Session ID (UUID) | Included in frontend events for session-level correlation |
| Anonymous ID (UUID) | Persists across sessions, not linked to identity |

The `TelemetryController` scrubs any property matching:
`username`, `email`, `password`, `phone`, `name`, `firstname`, `lastname`, `dateofbirth`, `dob`, `address`.

---

## File Reference

| File | Role |
|---|---|
| `backend/src/Saha.Application/Telemetry/AuthMetrics.cs` | All custom OTel counters and histograms |
| `backend/src/Saha.API/Controllers/TelemetryController.cs` | Frontend event ingest endpoint |
| `backend/src/Saha.API/Extensions/ServiceCollectionExtensions.cs` | OTel SDK wiring |
| `backend/src/Saha.API/Program.cs` | Serilog Loki sink |
| `frontend/src/core/telemetry/otel.ts` | W3C traceparent generation |
| `frontend/src/core/telemetry/events.ts` | Canonical event name constants |
| `frontend/src/core/telemetry/telemetry.service.ts` | Batching telemetry service |
| `frontend/src/core/api/telemetry.api.ts` | HTTP client for telemetry endpoint |
| `frontend/src/core/api/axios-instance.ts` | `traceparent` header injection |
| `frontend/src/vite-env.d.ts` | Vite env var type declarations |
| `frontend/.env.example` | Environment variable template |
