/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_APP_ENV?: string
  readonly VITE_APP_VERSION?: string
  readonly VITE_OTEL_ENABLED?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
