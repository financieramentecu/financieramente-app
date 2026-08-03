"use client"

import { useState } from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/features/shared/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/features/shared/ui/popover"

export interface MultiSelectOption {
  value: string
  label: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Seleccionar",
  className,
  disabled = false,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const filtered = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  )

  const toggle = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue))
    } else {
      onChange([...value, optionValue])
    }
  }

  const triggerLabel =
    value.length === 0
      ? placeholder
      : value.length === 1
        ? (options.find((o) => o.value === value[0])?.label ?? placeholder)
        : `${value.length} seleccionados`

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          role="combobox"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            value.length === 0 && "text-muted-foreground",
            className
          )}
          aria-expanded={open}
        >
          <span className="truncate">{triggerLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        collisionPadding={8}
        style={{
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'min(300px, var(--radix-popover-content-available-height, 300px))',
          overflow: 'hidden',
        }}
      >
        {/* Search — fixed height, never shrinks */}
        <div style={{ flexShrink: 0, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 12px' }}>
          <input
            style={{ flex: 1, height: '36px', background: 'transparent', outline: 'none', fontSize: '14px', color: 'inherit' }}
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              style={{ color: 'var(--muted-foreground)', lineHeight: 0 }}
            >
              <X style={{ width: '16px', height: '16px' }} />
            </button>
          )}
        </div>

        {/* List — fills remaining space and scrolls */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', fontSize: '14px', color: 'var(--muted-foreground)' }}>
              Sin resultados
            </div>
          ) : (
            filtered.map((opt) => {
              const checked = value.includes(opt.value)
              return (
                <div
                  key={opt.value}
                  role="option"
                  aria-selected={checked}
                  tabIndex={0}
                  onClick={() => toggle(opt.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      toggle(opt.value)
                    }
                  }}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-accent",
                    checked && "bg-accent/50"
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "grid h-4 w-4 shrink-0 place-content-center rounded-sm border border-primary",
                      checked && "bg-primary text-primary-foreground"
                    )}
                  >
                    {checked ? <Check className="h-3 w-3" /> : null}
                  </span>
                  <span>{opt.label}</span>
                </div>
              )
            })
          )}
        </div>

        {/* Clear — fixed height, never shrinks */}
        {value.length > 0 && (
          <div style={{ flexShrink: 0, borderTop: '1px solid var(--border)', padding: '8px' }}>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-sm"
              onClick={() => {
                onChange([])
                setOpen(false)
              }}
            >
              Limpiar selección
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
