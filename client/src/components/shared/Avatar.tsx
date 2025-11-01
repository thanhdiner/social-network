import { useState } from 'react'
import { getInitials, getAvatarColor } from '@/utils/avatarUtils'

interface AvatarProps {
  src?: string | null
  name: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeClasses = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-2xl',
}

export const Avatar = ({ src, name, size = 'md', className = '' }: AvatarProps) => {
  const sizeClass = sizeClasses[size]
  const [imgError, setImgError] = useState(false)
  
  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setImgError(true)}
        className={`rounded-full object-cover ${sizeClass} ${className}`}
      />
    )
  }

  const initial = getInitials(name)
  const colorClass = getAvatarColor(name)

  return (
    <div
      className={`rounded-full flex items-center justify-center font-semibold text-white ${colorClass} ${sizeClass} ${className}`}
    >
      {initial}
    </div>
  )
}
