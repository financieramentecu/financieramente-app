'use client'

import { Switch } from '@/features/shared/ui/switch'
import { Label } from '@/features/shared/ui/label'

// ─── Props ────────────────────────────────────────────────────────────────────

interface InternacionalToggleProps {
  checked: boolean
  onChange: (v: boolean) => void
}

// ─── InternacionalToggle ──────────────────────────────────────────────────────

export function InternacionalToggle({ checked, onChange }: InternacionalToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <Switch
        id="internacional-toggle"
        checked={checked}
        onCheckedChange={onChange}
        aria-label="Internacional"
      />
      <Label
        htmlFor="internacional-toggle"
        className="cursor-pointer select-none text-sm font-medium text-foreground"
      >
        Internacional
      </Label>
    </div>
  )
}
