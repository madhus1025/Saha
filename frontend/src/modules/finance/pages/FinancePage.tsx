import { ComingSoonModule } from '@/shared/components/feedback/ComingSoonModule'

export function FinancePage() {
  return (
    <ComingSoonModule
      title="Finance"
      description="Track shared expenses, set budgets, split bills, and build your financial future together."
      features={[
        'Shared expense tracking',
        'Budget planning & alerts',
        'Bill splitting',
        'Savings goals',
        'Financial reports',
        'Bank account linking',
      ]}
    />
  )
}
