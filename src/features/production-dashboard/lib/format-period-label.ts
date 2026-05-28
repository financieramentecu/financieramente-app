import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const fmt = (d: Date) => {
  const raw = format(d, 'dd MMM yyyy', { locale: es })
  // Capitalize month abbreviation: "01 ene 2025" → "01 Ene 2025"
  return raw.replace(/(\d{2} )(\w)/, (_, day, first) => day + first.toUpperCase())
}

/**
 * Formats a Date range into a human-readable Spanish period label.
 * Example: "01 Ene 2025 - 31 Dic 2025"
 */
export function formatPeriodLabel(start: Date, end: Date): string {
  return `${fmt(start)} - ${fmt(end)}`
}
