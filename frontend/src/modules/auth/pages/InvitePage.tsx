import { useNavigate } from 'react-router'
import { Button } from '@/shared/components/ui/Button'

/**
 * Chunk 3 placeholder.
 *
 * The invite screen is not in the "Together · Hearth Desktop II" deck and has no approved design
 * (spec assumption A6). Registration routes here, so it cannot simply not exist — but designing it
 * would be inventing product, which this work explicitly does not do.
 *
 * The backend contract it will use already exists and is covered by tests:
 *   POST /auth/invitations         { inviteeName, inviteeEmail } -> { token, expiresAt }
 *   POST /auth/invitations/accept  { token, ...invitee's own half }
 */
export function InvitePage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-8 text-center">
      <div>
        <h1 className="font-display text-3xl font-medium text-sandstone-900 dark:text-cream-200">
          Invite your person
        </h1>
        <p className="mt-1.5 text-copy-muted">
          This screen is still being designed. Your home is created and waiting.
        </p>
      </div>

      <Button className="w-full" size="lg" onClick={() => navigate('/waiting')}>
        Back to the threshold
      </Button>
    </div>
  )
}
