'use client'

import { useOriginDonut } from '../hooks/use-origin-donut'
import { OriginDonutChart } from './OriginDonutChart'

interface OriginDonutPanelProps {
  readonly trmRate: number | null
}

/**
 * Thin container panel that owns the useOriginDonut hook call and passes
 * the result to the pure OriginDonutChart renderer.
 *
 * Mirrors MsBarChartPanel shape:
 *   container (hook) → pure renderer
 */
export function OriginDonutPanel({ trmRate }: OriginDonutPanelProps) {
  const chartState = useOriginDonut()

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-foreground">
        Distribución por origen del cliente
      </h2>
      <OriginDonutChart chartState={chartState} trmRate={trmRate} />
    </section>
  )
}
