import { ComingSoonModule } from '@/shared/components/feedback/ComingSoonModule'

export function GoalsPage() {
  return (
    <ComingSoonModule
      title="Goals"
      description="Set shared dreams, track progress, and celebrate milestones together."
      features={[
        'Shared goal board',
        'Progress tracking',
        'Goal categories',
        'Milestone celebrations',
        'Accountability nudges',
        'Dream board',
      ]}
    />
  )
}
