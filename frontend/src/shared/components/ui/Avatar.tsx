import { useState } from 'react'
import { cn } from '@/core/utils/cn'

interface AvatarProps {
  src: string | null | undefined
  name: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeClasses = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
  xl: 'w-20 h-20 text-xl',
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const [imgError, setImgError] = useState(false)

  if (src && !imgError && !src.includes('placeholder.local')) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setImgError(true)}
        className={cn(
          'rounded-full object-cover ring-2 ring-forest-200 dark:ring-forest-700',
          sizeClasses[size],
          className,
        )}
      />
    )
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold',
        'bg-gradient-to-br from-forest-400 to-forest-600 text-cream-200',
        'ring-2 ring-forest-200 dark:ring-forest-700',
        sizeClasses[size],
        className,
      )}
      aria-label={name}
    >
      {getInitials(name)}
    </div>
  )
}
