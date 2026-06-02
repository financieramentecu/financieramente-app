'use client'

import { useStatusDonut } from '../hooks/use-status-donut'
import { StatusDonutChart } from './StatusDonutChart'

interface StatusDonutPanelProps {
  readonly trmRate: number | null
}

/**
 * Status Donut panel — composes useStatusDonut hook + StatusDonutChart.
 * Passes trmRate down for COP → USD conversion in tooltip and aggregate.
 */
export function StatusDonutPanel({ trmRate }: StatusDonutPanelProps) {
  const chartState = useStatusDonut(trmRate)

  return (
    <section className="flex flex-col h-full">
      <h2 className="mb-2 text-sm font-semibold text-foreground">
        Distribución por estado
      </h2>
      <StatusDonutChart chartState={chartState} trmRate={trmRate} />
    </section>
  )
}
