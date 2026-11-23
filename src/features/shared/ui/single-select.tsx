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
import type { MultiSelectOption } from "@/features/shared/ui/multi-select"

interface SingleSelectProps {
  options: MultiSelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  ariaLabel?: string
  searchLabel?: string
}

/** Searchable list that keeps a single selected value. */
export function SingleSelect({
  options,
  value,
  onChange,
  placeholder = "Seleccionar",
  className,
  disabled = false,
  ariaLabel,
  searchLabel = "Buscar",
}: SingleSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const query = search.trim().toLowerCase()
  const filtered = options.filter((option) => option.label.toLowerCase().includes(query))
  const selected = options.find((option) => option.value === value)

  function choose(next: string) {
    onChange(next)
    setSearch("")
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          role="combobox"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !selected && "text-muted-foreground",
            className
          )}
          aria-expanded={open}
          aria-label={ariaLabel}
        >
          <span className="truncate">{selected?.label ?? placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        collisionPadding={8}
        style={{
          display: "flex",
          flexDirection: "column",
          maxHeight: "min(28rem, var(--radix-popover-content-available-height, 28rem))",
          overflow: "hidden",
        }}
      >
        <div style={{ flexShrink: 0, borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", padding: "0 12px" }}>
          <input
            aria-label={searchLabel}
            style={{ flex: 1, height: "36px", background: "transparent", outline: "none", fontSize: "14px", color: "inherit" }}
            placeholder="Buscar..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {search ? (
            <button
              type="button"
              aria-label="Limpiar búsqueda"
              onClick={() => setSearch("")}
              style={{ color: "var(--muted-foreground)", lineHeight: 0 }}
            >
              <X style={{ width: "16px", height: "16px" }} />
            </button>
          ) : null}
        </div>
        <div
          role="listbox"
          aria-label={ariaLabel}
          className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]"
          style={{ scrollbarGutter: "stable" }}
        >
          {filtered.length === 0 ? (
            <div style={{ padding: "24px 0", textAlign: "center", fontSize: "14px", color: "var(--muted-foreground)" }}>
              Sin resultados
            </div>
          ) : (
            filtered.map((option) => {
              const checked = option.value === value
              return (
                <div
                  key={option.value}
                  role="option"
                  aria-selected={checked}
                  tabIndex={0}
                  onClick={() => choose(option.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault()
                      choose(option.value)
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
                      "grid h-4 w-4 shrink-0 place-content-center rounded-full border border-primary",
                      checked && "bg-primary text-primary-foreground"
                    )}
                  >
                    {checked ? <Check className="h-3 w-3" /> : null}
                  </span>
                  <span>{option.label}</span>
                </div>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
