import { ComingSoonModule } from '@/shared/components/feedback/ComingSoonModule'

export function CalendarPage() {
  return (
    <ComingSoonModule
      title="Calendar"
      description="Never miss a special date again — anniversaries, birthdays, date nights, and more."
      features={[
        'Shared couple calendar',
        'Anniversary tracking',
        'Date night planner',
        'Event reminders',
        'Travel planning',
        'Sync with device calendar',
      ]}
    />
  )
}
