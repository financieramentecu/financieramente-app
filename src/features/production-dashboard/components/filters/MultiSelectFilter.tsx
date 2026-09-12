'use client'

import { useState, useMemo } from 'react'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/features/shared/ui/popover'
import { toggleItem } from '../../lib/toggle-todas'

// ─── Props ────────────────────────────────────────────────────────────────────

interface FilterItem {
  id: number
  label: string
}

interface MultiSelectFilterProps<T extends FilterItem> {
  items: T[]
  value: number[]
  onChange: (ids: number[]) => void
  placeholder: string
  todasLabel: string
  searchable?: boolean
}

// ─── MultiSelectFilter ────────────────────────────────────────────────────────

export function MultiSelectFilter<T extends FilterItem>({
  items,
  value,
  onChange,
  placeholder,
  todasLabel,
  searchable = false,
}: MultiSelectFilterProps<T>) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  // Tracks "deselect all" intent within a popover session.
  // value=[] means "all" in the parent, so we need local state for "none selected".
  // Resets on popover close so the trigger always reflects committed state.
  const [noneMode, setNoneMode] = useState(false)

  const allSelected = value.length === 0 && !noneMode

  const summaryLabel = allSelected
    ? todasLabel
    : value.length === 1
      ? (items.find((i) => i.id === value[0])?.label ?? todasLabel)
      : `${value.length} seleccionados`

  const filtered = useMemo(() => {
    if (!searchable || query.trim() === '') return items
    const q = query.trim().toLowerCase()
    return items.filter((i) => i.label.toLowerCase().includes(q))
  }, [items, query, searchable])

  const handleTodasClick = () => {
    if (allSelected) {
      // Enter "none selected" mode — local only until user picks a specific item
      setNoneMode(true)
    } else {
      setNoneMode(false)
      onChange([])
    }
  }

  const handleItemClick = (id: number) => {
    if (noneMode) {
      // First click after "deselect all" — start a fresh specific selection
      setNoneMode(false)
      onChange([id])
    } else if (allSelected) {
      // Deselect this one item — keep all others explicitly
      const remaining = items.map((i) => i.id).filter((i) => i !== id)
      onChange(remaining.length === 0 ? [] : remaining)
    } else {
      onChange(toggleItem(value, id))
    }
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) {
      setQuery('')
      setNoneMode(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="button"
          aria-label={placeholder}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="group flex h-full min-h-[3.25rem] w-full min-w-0 flex-col justify-center gap-0 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-left transition-colors hover:bg-muted"
        >
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground leading-none">
            {placeholder}
          </span>
          <div className="flex items-center justify-between gap-1 mt-0.5">
            <span className="truncate text-xs font-semibold text-foreground">
              {summaryLabel}
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-aria-expanded:rotate-180" />
          </div>
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-64 p-0" align="start">
        {/* Search input — only when searchable */}
        {searchable && (
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Buscar ${placeholder.toLowerCase()}…`}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label="Limpiar búsqueda"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        <div className="max-h-60 overflow-y-auto">
          <ul role="listbox" aria-label={placeholder} className="py-1">
            {/* Todas/Todos — only show when not filtering */}
            {!query && (
              <li
                role="option"
                aria-selected={allSelected}
                aria-label={todasLabel}
                onClick={handleTodasClick}
                className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-muted"
              >
                <span
                  className={[
                    'flex h-4 w-4 items-center justify-center rounded-sm border',
                    noneMode ? 'border-border opacity-40' : 'border-border',
                  ].join(' ')}
                  aria-hidden="true"
                >
                  {allSelected && <Check className="h-3 w-3" />}
                </span>
                <span className={['font-medium', noneMode ? 'opacity-40' : ''].join(' ')}>
                  {todasLabel}
                </span>
              </li>
            )}

            {/* Filtered items */}
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-center text-xs text-muted-foreground">
                Sin resultados para &quot;{query}&quot;
              </li>
            ) : (
              filtered.map((item) => {
                const isSelected = allSelected || value.includes(item.id)
                return (
                  <li
                    key={item.id}
                    role="option"
                    aria-selected={isSelected}
                    aria-label={item.label}
                    onClick={() => handleItemClick(item.id)}
                    className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-muted"
                  >
                    <span
                      className="flex h-4 w-4 items-center justify-center rounded-sm border border-border"
                      aria-hidden="true"
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </span>
                    <span>{item.label}</span>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      </PopoverContent>
    </Popover>
  )
}
