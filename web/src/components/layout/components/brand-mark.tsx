/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { useMemo, useState } from 'react'

import { cn } from '@/lib/utils'

export type BrandMarkVariant =
  | 'compact'
  | 'header'
  | 'sidebar'
  | 'auth'
  | 'footer'
  | 'prominent'

interface BrandMarkProps {
  src: string
  name?: string
  alt?: string
  loading?: boolean
  logoLoaded?: boolean
  variant?: BrandMarkVariant
  className?: string
}

const VARIANT_CLASSES: Record<BrandMarkVariant, string> = {
  compact: 'size-5 rounded-md',
  header: 'size-7 rounded-lg',
  sidebar: 'size-8 rounded-lg',
  auth: 'size-8 rounded-full',
  footer: 'size-7 rounded-lg',
  prominent: 'size-10 rounded-xl',
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '◎'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return `${words[0][0]}${words.at(-1)?.[0] ?? ''}`.toUpperCase()
}

/**
 * Shared system brand image with consistent sizing and a visible error state.
 * The fallback keeps the configured product name visible when a remote logo
 * cannot be loaded, instead of exposing a broken image or a hidden default.
 */
export function BrandMark(props: BrandMarkProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const variant = props.variant ?? 'compact'
  const name = props.name?.trim() || ''
  const alt = props.alt || name || 'Logo'
  const initials = useMemo(() => getInitials(name), [name])
  const hasError = failedSrc === props.src

  if (props.loading) {
    return (
      <span
        aria-hidden='true'
        data-slot='brand-mark'
        data-state='loading'
        className={cn(
          'skeleton-shimmer shrink-0',
          VARIANT_CLASSES[variant],
          props.className
        )}
      />
    )
  }

  if (hasError || !props.src) {
    return (
      <span
        role='img'
        aria-label={alt}
        data-slot='brand-mark'
        data-state='fallback'
        className={cn(
          'bg-primary/10 text-primary inline-flex shrink-0 items-center justify-center overflow-hidden border border-primary/15 text-[0.6em] font-bold tracking-tight',
          VARIANT_CLASSES[variant],
          props.className
        )}
      >
        {initials}
      </span>
    )
  }

  return (
    <span
      data-slot='brand-mark'
      data-state={props.logoLoaded ? 'loaded' : 'pending'}
      className={cn(
        'bg-muted/40 inline-flex shrink-0 items-center justify-center overflow-hidden',
        VARIANT_CLASSES[variant],
        props.className
      )}
    >
      <img
        src={props.src}
        alt={alt}
        onError={() => setFailedSrc(props.src)}
        className={cn(
          'size-full object-contain transition-opacity duration-200',
          props.logoLoaded ? 'opacity-100' : 'opacity-0'
        )}
      />
    </span>
  )
}
