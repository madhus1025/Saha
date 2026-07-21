import { useEffect } from 'react'
import { useLocation, useMatches } from 'react-router'

const APP_NAME = 'Saha'

/** Routes carry their page name in `handle.title`. */
export interface RouteHandle {
  title?: string
}

/**
 * Keeps `document.title` in step with the active route.
 *
 * A single-page app that never updates its title fails WCAG 2.4.2: screen readers announce the
 * title on navigation, so one static value leaves a blind user with no confirmation that anything
 * happened — and every history entry, bookmark and open tab looks identical (SAHA-D09).
 *
 * The live region below is the other half of the same problem: assistive technology needs the route
 * change announced, not merely reflected in a tab it is not looking at.
 */
export function DocumentTitle() {
  const matches = useMatches()
  const location = useLocation()

  // The deepest match that declares a title wins, so nested routes can override their parent.
  const pageTitle = [...matches]
    .reverse()
    .map((match) => (match.handle as RouteHandle | undefined)?.title)
    .find((title): title is string => typeof title === 'string' && title.length > 0)

  const title = pageTitle ? `${pageTitle} · ${APP_NAME}` : APP_NAME

  useEffect(() => {
    document.title = title
  }, [title])

  return (
    <span
      // Announce the new page to screen readers on navigation. Visually hidden, never focusable.
      // Prefixed so the announcement never duplicates the page's own visible heading text — a bare
      // "Page not found" here would collide with the 404 heading for both screen readers and tests.
      key={location.pathname}
      role="status"
      aria-live="polite"
      className="sr-only"
    >
      {`Navigated to ${pageTitle ?? APP_NAME}`}
    </span>
  )
}
