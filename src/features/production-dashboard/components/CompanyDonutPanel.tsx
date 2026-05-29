'use client'

import { useCompanyDonut } from '../hooks/use-company-donut'
import { CompanyDonutChart } from './CompanyDonutChart'

interface CompanyDonutPanelProps {
  readonly trmRate: number | null
}

export function CompanyDonutPanel({ trmRate }: CompanyDonutPanelProps) {
  const chartState = useCompanyDonut()

  return (
    <section className="flex flex-col h-full">
      <h2 className="mb-2 text-sm font-semibold text-foreground">
        Distribución por compañía
      </h2>
      <CompanyDonutChart chartState={chartState} trmRate={trmRate} />
    </section>
  )
}
