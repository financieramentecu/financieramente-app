'use client'

import * as React from 'react'
import { AlertCircle, BriefcaseBusiness, ClipboardCheck, Headphones } from 'lucide-react'
import type { CrmSummary } from './crm-summary.types'

interface SummaryResponse { data?: CrmSummary }

const EMPTY: CrmSummary = { opportunities: 0, stageCounts: [], openTasks: 0, overdueTasks: 0, openCases: 0, overdueCases: 0 }

/** Responsive aggregate CRM dashboard. It intentionally renders no PII or raw activity payloads. */
export function CrmSummaryCards({ enabled }: { enabled: boolean }) {
  const [summary, setSummary] = React.useState<CrmSummary>(EMPTY)
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'error'>('idle')

  React.useEffect(() => {
    if (!enabled) return
    let active = true
    setStatus('loading')
    void fetch('/api/crm/reports/summary')
      .then(async (response) => {
        if (!response.ok) throw new Error('No fue posible cargar el resumen CRM')
        return (await response.json()) as SummaryResponse
      })
      .then((response) => { if (active) { setSummary(response.data ?? EMPTY); setStatus('idle') } })
      .catch(() => { if (active) setStatus('error') })
    return () => { active = false }
  }, [enabled])

  if (!enabled) return null
  if (status === 'loading') return <p role="status" className="text-sm text-muted-foreground">Cargando resumen CRM…</p>
  if (status === 'error') return <p role="alert" className="text-sm text-destructive">No fue posible cargar el resumen CRM.</p>

  const cards = [
    { label: 'Oportunidades activas', value: summary.opportunities, icon: BriefcaseBusiness },
    { label: 'Tareas abiertas', value: summary.openTasks, detail: summary.overdueTasks ? `${summary.overdueTasks} vencidas` : undefined, icon: ClipboardCheck },
    { label: 'Casos abiertos', value: summary.openCases, detail: summary.overdueCases ? `${summary.overdueCases} vencidos` : undefined, icon: Headphones },
  ]
  return <section aria-label="Resumen CRM" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
    {cards.map(({ label, value, detail, icon: Icon }) => <article key={label} className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2"><p className="text-sm text-muted-foreground">{label}</p><Icon className="size-4 text-muted-foreground" aria-hidden /></div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      {detail && <p className="mt-1 flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400"><AlertCircle className="size-3" aria-hidden />{detail}</p>}
    </article>)}
  </section>
}
