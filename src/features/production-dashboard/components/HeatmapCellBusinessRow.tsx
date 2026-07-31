import { BusinessStatusBadge } from '@/features/negocios/components/ui/BusinessStatusBadge'
import type { CellBusinessRowView } from '../types/heatmap-cell-expansion.types'

interface HeatmapCellBusinessRowProps {
  readonly business: CellBusinessRowView
}

const numFormatter = new Intl.NumberFormat('es-CO', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

function formatValue(value: number | null, currencyName: string | null): string {
  if (value === null) return '-'
  const currencySuffix = currencyName ? ` ${currencyName}` : ''
  return `$${numFormatter.format(value)}${currencySuffix}`
}

/**
 * One row of the heatmap cell expanded business list. Pure presentation —
 * no fetch, no Prisma. Missing value/product renders `-` per product decision;
 * the row still appears.
 */
export function HeatmapCellBusinessRow({ business }: HeatmapCellBusinessRowProps) {
  return (
    <tr className="border-b border-border/60 last:border-none hover:bg-muted/30">
      <td className="px-2 py-1.5 text-xs">{business.productName ?? '-'}</td>
      <td className="px-2 py-1.5 text-xs">{business.contract ?? '-'}</td>
      <td className="px-2 py-1.5 text-right text-xs font-semibold tabular-nums">
        {formatValue(business.value, business.currencyName)}
      </td>
      <td className="px-2 py-1.5 text-xs">
        <BusinessStatusBadge status={business.status} className="text-xs" />
      </td>
      <td className="px-2 py-1.5 text-right text-xs">
        <a
          href={`/dashboard/negocios/${business.idBusiness}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-medium text-primary hover:text-primary/80 hover:underline"
        >
          Ir a negocio
          <span aria-hidden="true">↗</span>
        </a>
      </td>
    </tr>
  )
}
