import { ComingSoonModule } from '@/shared/components/feedback/ComingSoonModule'

export function MemoriesPage() {
  return (
    <ComingSoonModule
      title="Memories"
      description="Create a beautiful timeline of your journey together — photos, videos, and stories."
      features={[
        'Photo & video albums',
        'Timeline of milestones',
        'Anniversary reminders',
        'Shared scrapbooks',
        'Memory search',
        'Privacy controls',
      ]}
    />
  )
}
