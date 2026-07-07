/**
 * Minimal W3C Trace Context support for the browser.
 *
 * Rather than wiring up the full OTel SDK (which requires span processors,
 * exporters and careful version alignment), we generate compliant W3C
 * `traceparent` values directly.  This is sufficient for distributed
 * tracing: the backend's AspNetCore OTel instrumentation reads the
 * `traceparent` header injected by the Axios interceptor and links the
 * inbound HTTP span to the same trace.
 *
 * Format: 00-{traceId:32hex}-{spanId:16hex}-01
 * Spec: https://www.w3.org/TR/trace-context/
 */

let _currentTraceparent: string | undefined

/**
 * Call once at application startup to generate a session-level trace ID.
 * All API calls within this browser tab share the same trace.
 */
export function initOtel(): void {
  _currentTraceparent = _generateTraceparent()
}

/**
 * Returns the W3C `traceparent` header value for the current session.
 * Returns `undefined` before `initOtel()` is called.
 */
export function getTraceparentHeader(): string | undefined {
  return _currentTraceparent
}

/**
 * Rotate the traceparent (call when starting a new logical user operation,
 * e.g. login attempt) so the backend span links to a fresh trace.
 */
export function rotateSpanId(): void {
  if (!_currentTraceparent) return
  // Keep the same traceId, rotate only the spanId so the entire auth
  // flow stays on one trace while each operation has its own span.
  const parts = _currentTraceparent.split('-')
  if (parts.length === 4) {
    parts[2] = _randomHex(8)
    _currentTraceparent = parts.join('-')
  }
}

function _generateTraceparent(): string {
  const traceId = _randomHex(16)
  const spanId  = _randomHex(8)
  return `00-${traceId}-${spanId}-01`
}

function _randomHex(bytes: number): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
