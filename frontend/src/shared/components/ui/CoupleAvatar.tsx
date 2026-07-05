import { useState } from 'react'
import { cn } from '@/core/utils/cn'

interface CoupleAvatarProps {
  src: string | null | undefined
  name: string
  role: string | null | undefined
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeClasses = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-14 h-14',
  xl: 'w-20 h-20',
}

export function CoupleAvatar({ src, name, role, size = 'xl', className }: CoupleAvatarProps) {
  const [imgError, setImgError] = useState(false)

  const isWife = role?.toLowerCase().includes('wife') || role?.toLowerCase().includes('woman')
  const illustrationSrc = isWife ? '/avatar-wife.svg' : '/avatar-husband.svg'

  const isValidSrc = src && !imgError && !src.includes('placeholder.local')
  const effectiveSrc = isValidSrc ? src : illustrationSrc

  return (
    <img
      src={effectiveSrc}
      alt={name}
      onError={() => {
        if (!imgError) setImgError(true)
      }}
      className={cn(
        'rounded-full object-cover ring-2 ring-forest-200 dark:ring-forest-700 flex-shrink-0',
        sizeClasses[size],
        className,
      )}
    />
  )
}
