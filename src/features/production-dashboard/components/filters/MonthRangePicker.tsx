"use client"

import { useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/features/shared/ui/popover"
import { Calendar } from "@/features/shared/ui/calendar"

interface DateRange {
  start: Date
  end: Date
}

interface MonthRangePickerProps {
  value: DateRange
  onChange: (range: DateRange) => void
  error?: string
}

const fmtDate = (d: Date) => {
  const raw = format(d, "dd MMM yyyy", { locale: es })
  return raw.replace(/(\d{2} )(\w)/, (_, day, first) => day + first.toUpperCase())
}

function DatePickerCell({
  label,
  date,
  onSelect,
  disabled,
}: {
  label: string
  date: Date
  onSelect: (d: Date) => void
  disabled?: (d: Date) => boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="group flex h-full min-h-[3.25rem] w-full flex-col justify-center gap-0 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-left transition-colors duration-150 hover:bg-muted cursor-pointer"
        >
          <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground leading-none tracking-wide uppercase">
            <CalendarIcon className="h-3 w-3" />
            {label}
          </span>
          <span className="mt-0.5 text-xs font-semibold text-foreground leading-snug">
            {fmtDate(date)}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            if (d) { onSelect(d); setOpen(false) }
          }}
          disabled={disabled}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}

export function MonthRangePicker({ value, onChange, error }: MonthRangePickerProps) {
  return (
    <div className="flex h-full min-h-[3.25rem] flex-col gap-1.5 lg:col-span-2">
      <div className="grid h-full grid-cols-2 items-stretch gap-2">
        <DatePickerCell
          label="Desde"
          date={value.start}
          onSelect={(start) => onChange({ ...value, start })}
        />
        <DatePickerCell
          label="Hasta"
          date={value.end}
          onSelect={(end) => onChange({ ...value, end })}
          disabled={(d) => d < value.start}
        />
      </div>
      {error && (
        <p className="text-xs text-destructive font-medium px-1">{error}</p>
      )}
    </div>
  )
}
