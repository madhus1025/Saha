import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from '@/app/App'
import '@/app/globals.css'
import { initOtel } from '@/core/telemetry/otel'

// Initialise OpenTelemetry before anything else so the trace context
// propagator is registered for all subsequent Axios requests.
initOtel()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
