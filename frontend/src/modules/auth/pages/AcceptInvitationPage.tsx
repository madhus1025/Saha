import { Link } from 'react-router'

/**
 * Chunk 3 placeholder — reached from the login footer's "I have an invitation".
 *
 * The invitee supplies their own half here and inherits the couple's TogetherID and shared
 * password. The TogetherID must be shown before they commit (spec FR-30). No design exists yet
 * (spec assumption A6), so this screen is intentionally not built.
 */
export function AcceptInvitationPage() {
  return (
    <div className="space-y-8 text-center">
      <div>
        <h1 className="font-display text-3xl font-medium text-sandstone-900 dark:text-cream-200">
          You’ve been invited
        </h1>
        <p className="mt-1.5 text-sandstone-600 dark:text-sandstone-400">
          This screen is still being designed. Please use the link in your invitation email.
        </p>
      </div>

      <Link to="/login" className="text-sm font-semibold text-forest-700 dark:text-sage-300 hover:underline">
        Back to sign in
      </Link>
    </div>
  )
}
