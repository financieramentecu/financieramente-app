"use client"

import { useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"
import { Button } from "@/features/shared/ui/button"
import { Calendar } from "@/features/shared/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/features/shared/ui/popover"

interface DateRangePickerProps {
  value: DateRange | undefined
  onChange: (range: DateRange | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

/**
 * Shared DateRangePicker component.
 * Uses Popover + Calendar mode="range", locale es, format dd/MM/yyyy.
 * Must NOT be duplicated per feature.
 */
export function DateRangePicker({
  value,
  onChange,
  placeholder = "Seleccionar rango",
  className,
  disabled = false,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false)

  const displayText = (() => {
    if (!value?.from) return placeholder
    if (!value.to) return format(value.from, "dd/MM/yyyy", { locale: es })
    return `${format(value.from, "dd/MM/yyyy", { locale: es })} – ${format(value.to, "dd/MM/yyyy", { locale: es })}`
  })()

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal",
              !value?.from && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {displayText}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={value}
            onSelect={(range) => {
              onChange(range)
              if (range?.from && range?.to) {
                setOpen(false)
              }
            }}
            locale={es}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
