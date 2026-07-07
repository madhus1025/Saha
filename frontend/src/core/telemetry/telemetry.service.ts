/**
 * TelemetryService — the single entry-point for all client-side telemetry.
 *
 * Design decisions:
 *  - Events are batched and sent to the backend every 3 seconds (or on flush).
 *  - Telemetry NEVER throws or rejects — it silently swallows errors so it
 *    cannot break the app under any circumstances.
 *  - PII is never included: no usernames, emails, passwords, or names.
 *    Only anonymous IDs, session IDs, trace IDs, and safe metadata are sent.
 *  - The `anonymousId` persists in localStorage across sessions.
 *  - The `sessionId` lives in sessionStorage (cleared on tab close).
 *  - After login the `partnerId` is attached to subsequent events (not PII).
 *
 * Usage:
 *   import { telemetry } from '@/core/telemetry/telemetry.service'
 *   telemetry.track(TelemetryEvents.LOGIN_PAGE_VIEWED)
 */

import { getTraceparentHeader } from './otel'
import { telemetryApi }         from '@/core/api/telemetry.api'
import type { TelemetryEventPayload } from '@/core/api/telemetry.api'

const ANON_ID_KEY     = 'saha_anon_id'
const SESSION_ID_KEY  = 'saha_session_id'
const FLUSH_INTERVAL  = 3_000  // ms
const MAX_BATCH_SIZE  = 50

class TelemetryService {
  private readonly _anonymousId:  string
  private readonly _sessionId:    string
  private _partnerId: string | null = null

  private _queue:    TelemetryEventPayload[]   = []
  private _timer:    ReturnType<typeof setTimeout> | null = null

  constructor() {
    this._anonymousId = this._getOrCreate(ANON_ID_KEY,    'localStorage')
    this._sessionId   = this._getOrCreate(SESSION_ID_KEY, 'sessionStorage')
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Record a named event with optional metadata properties.
   * Properties must NEVER contain PII (the backend enforces this too).
   */
  track(name: string, properties: Record<string, string> = {}): void {
    const event: TelemetryEventPayload = {
      name,
      timestamp:   new Date().toISOString(),
      sessionId:   this._sessionId,
      anonymousId: this._anonymousId,
      traceId:     getTraceparentHeader(),
      properties: {
        environment: import.meta.env.VITE_APP_ENV   ?? 'production',
        app_version: import.meta.env.VITE_APP_VERSION ?? '1.0.0',
        platform:    'web',
        ...this._deviceContext(),
        ...(this._partnerId ? { partner_id: this._partnerId } : {}),
        ...properties,
      },
    }

    this._queue.push(event)

    if (this._queue.length >= MAX_BATCH_SIZE) {
      void this._flush()
    } else {
      this._scheduleFlush()
    }
  }

  /**
   * Call once after a successful login so subsequent events carry the partner ID.
   * Note: partner ID is NOT PII — it is the internal UUID, not the username.
   */
  identify(partnerId: string): void {
    this._partnerId = partnerId
  }

  /**
   * Clear the identified user (e.g. on logout).
   */
  reset(): void {
    this._partnerId = null
  }

  /**
   * Force-flush the current batch immediately (call on page unload, logout, etc.)
   */
  async flush(): Promise<void> {
    await this._flush()
  }

  // ── Internal ────────────────────────────────────────────────────────────────

  private _scheduleFlush(): void {
    if (this._timer) return
    this._timer = setTimeout(() => void this._flush(), FLUSH_INTERVAL)
  }

  private async _flush(): Promise<void> {
    if (this._timer) {
      clearTimeout(this._timer)
      this._timer = null
    }

    if (this._queue.length === 0) return

    const batch = this._queue.splice(0, MAX_BATCH_SIZE)

    try {
      await telemetryApi.sendEvents({ events: batch })
    } catch {
      // Telemetry must never throw. Drop the batch on failure.
    }
  }

  /** Collect safe (non-PII) browser context attributes. */
  private _deviceContext(): Record<string, string> {
    const ua = navigator.userAgent
    return {
      browser:     this._detectBrowser(ua),
      device_type: this._detectDeviceType(ua),
    }
  }

  private _detectBrowser(ua: string): string {
    if (/Edg\//.test(ua))     return 'edge'
    if (/Chrome\//.test(ua))  return 'chrome'
    if (/Firefox\//.test(ua)) return 'firefox'
    if (/Safari\//.test(ua))  return 'safari'
    return 'other'
  }

  private _detectDeviceType(ua: string): string {
    if (/Mobi|Android/i.test(ua)) return 'mobile'
    if (/Tablet|iPad/i.test(ua))  return 'tablet'
    return 'desktop'
  }

  private _getOrCreate(
    key: string,
    store: 'localStorage' | 'sessionStorage',
  ): string {
    try {
      const storage = store === 'localStorage' ? localStorage : sessionStorage
      let id = storage.getItem(key)
      if (!id) {
        id = crypto.randomUUID()
        storage.setItem(key, id)
      }
      return id
    } catch {
      // Storage may be blocked (e.g. incognito + strict settings)
      return crypto.randomUUID()
    }
  }
}

/** Singleton — import and use anywhere in the app. */
export const telemetry = new TelemetryService()
