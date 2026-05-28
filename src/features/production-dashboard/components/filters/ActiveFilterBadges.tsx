'use client'

import { X } from 'lucide-react'
import { Badge } from '@/features/shared/ui/badge'
import type { ActiveBadge } from '../../types/dashboard-filter.types'

// ─── Props ────────────────────────────────────────────────────────────────────

interface ActiveFilterBadgesProps {
  badges: ActiveBadge[]
}

// ─── ActiveFilterBadges ───────────────────────────────────────────────────────

export function ActiveFilterBadges({ badges }: ActiveFilterBadgesProps) {
  if (badges.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Filtros activos">
      {badges.map((badge) => (
        <Badge
          key={badge.key}
          variant="secondary"
          className="flex items-center gap-1.5 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800 px-2.5 py-1 text-xs font-medium rounded-full"
        >
          {badge.label}
        </Badge>
      ))}
    </div>
  )
}
