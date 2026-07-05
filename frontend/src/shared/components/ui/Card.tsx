import { cn } from '@/core/utils/cn'

interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

interface CardHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  className?: string
}

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

export function Card({ children, className, padding = 'md' }: CardProps) {
  return (
    <div className={cn('card-warm', paddingClasses[padding], className)}>
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, action, className }: CardHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4 mb-6', className)}>
      <div>
        <h2 className="section-header">{title}</h2>
        {subtitle && (
          <p className="text-sm text-sandstone-500 dark:text-sandstone-400 mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}
