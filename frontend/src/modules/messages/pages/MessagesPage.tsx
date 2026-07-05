import { ComingSoonModule } from '@/shared/components/feedback/ComingSoonModule'

export function MessagesPage() {
  return (
    <ComingSoonModule
      title="Messages"
      description="A private, encrypted space for heartfelt messages between just the two of you."
      features={[
        'End-to-end encrypted messages',
        'Voice messages',
        'Reaction emojis',
        'Message search',
        'Scheduled messages',
        'Love notes',
      ]}
    />
  )
}
