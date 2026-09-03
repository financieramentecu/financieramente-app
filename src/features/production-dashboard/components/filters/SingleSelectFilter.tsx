'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/features/shared/ui/select'

// ─── Props ────────────────────────────────────────────────────────────────────

interface SelectOption {
  value: string
  label: string
}

interface SingleSelectFilterProps {
  options: SelectOption[]
  value: string
  onChange: (v: string) => void
  placeholder: string
}

// ─── SingleSelectFilter ───────────────────────────────────────────────────────

export function SingleSelectFilter({
  options,
  value,
  onChange,
  placeholder,
}: SingleSelectFilterProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-full min-h-[3.25rem] w-full min-w-0 items-center rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs font-semibold hover:bg-muted [&>span]:line-clamp-none">
        <div className="flex min-w-0 flex-1 flex-col gap-0 text-left">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground leading-none">
            {placeholder}
          </span>
          <span className="min-w-0 truncate whitespace-nowrap [&_span]:block [&_span]:truncate [&_span]:whitespace-nowrap">
            <SelectValue placeholder={placeholder} />
          </span>
        </div>
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
