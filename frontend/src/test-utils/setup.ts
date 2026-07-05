import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
  localStorage.clear()
  sessionStorage.clear()
})

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    disconnect: vi.fn(),
    observe: vi.fn(),
    unobserve: vi.fn(),
  })),
})

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    disconnect: vi.fn(),
    observe: vi.fn(),
    unobserve: vi.fn(),
    root: null,
    rootMargin: '',
    thresholds: [],
  })),
})
