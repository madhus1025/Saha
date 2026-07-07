/**
 * Telemetry API — sends batches of client-side events to the backend
 * ingest endpoint (POST /api/v1/telemetry/events).
 *
 * The backend logs each event via Serilog (→ Grafana Loki) and increments
 * the matching OTel counter (→ Grafana Mimir).
 */

import { apiClient } from './axios-instance'

export interface TelemetryEventPayload {
  name: string
  timestamp: string
  sessionId: string
  anonymousId?: string
  traceId?: string
  properties: Record<string, string>
}

export interface TelemetryBatchPayload {
  events: TelemetryEventPayload[]
}

export const telemetryApi = {
  sendEvents: (batch: TelemetryBatchPayload): Promise<void> =>
    apiClient.post('/telemetry/events', batch).then(() => undefined),
}
