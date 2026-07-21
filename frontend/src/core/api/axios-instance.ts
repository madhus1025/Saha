import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/shared/stores/auth.store'
import { getTraceparentHeader } from '@/core/telemetry/otel'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Required for refresh token cookie
  timeout: 30_000,
})

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // Propagate W3C trace context so backend OTel traces can link to
    // the browser-side span that triggered this request.
    const traceparent = getTraceparentHeader()
    if (traceparent) {
      config.headers['traceparent'] = traceparent
    }

    return config
  },
  (error) => Promise.reject(error),
)

let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (error: unknown) => void
}> = []

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token!)
  })
  failedQueue = []
}

/**
 * Unauthenticated auth entry points. A 401 from any of these means the request itself failed (e.g.
 * wrong password), NOT that an access token expired — so they must never trigger the token-refresh
 * retry. Doing so would replace the real error ("Invalid username or password.") with a confusing
 * "Refresh token not found." from the spurious /auth/refresh call. (/auth/session is intentionally
 * absent: it is authenticated and SHOULD refresh on a 401.)
 */
const NO_REFRESH_RETRY_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/invitations/accept',
]

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !NO_REFRESH_RETRY_PATHS.some((path) => originalRequest.url?.includes(path))
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return apiClient(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const response = await apiClient.post<{ accessToken: string; expiresAt: string }>(
          '/auth/refresh',
        )
        const { accessToken } = response.data
        useAuthStore.getState().setAccessToken(accessToken)
        processQueue(null, accessToken)
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return apiClient(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        useAuthStore.getState().logout()
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  },
)
