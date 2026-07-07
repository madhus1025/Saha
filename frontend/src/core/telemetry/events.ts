/**
 * Canonical telemetry event names shared between frontend and backend.
 * Keep in sync with FrontendEventNames in:
 * backend/src/Saha.Application/Telemetry/AuthMetrics.cs
 *
 * Naming convention: <domain>.<entity>.<action>
 */

// ── Authentication funnel ─────────────────────────────────────────────────────

/** Login page was rendered (top of funnel). */
export const LOGIN_PAGE_VIEWED        = 'auth.login.page_viewed'

/** User clicked the "Sign in" submit button. */
export const LOGIN_BUTTON_CLICKED     = 'auth.login.button_clicked'

/** Registration page was rendered. */
export const REGISTER_PAGE_VIEWED     = 'auth.register.page_viewed'

/** User clicked "Forgot password?" link. */
export const FORGOT_PASSWORD_CLICKED  = 'auth.forgot_password.clicked'

// ── App lifecycle ─────────────────────────────────────────────────────────────

/** Fired once after a successful login when the user identity is known. */
export const USER_IDENTIFIED          = 'app.user.identified'

/** Grouped export for convenient import. */
export const TelemetryEvents = {
  LOGIN_PAGE_VIEWED,
  LOGIN_BUTTON_CLICKED,
  REGISTER_PAGE_VIEWED,
  FORGOT_PASSWORD_CLICKED,
  USER_IDENTIFIED,
} as const
