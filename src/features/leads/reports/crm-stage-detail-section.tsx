'use client'

import { Fragment, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/features/shared/ui/button'
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from '@/features/shared/ui/card'
import { Skeleton } from '@/features/shared/ui/skeleton'
import { LeadDetailPanel } from '@/features/leads/components/lead-detail-panel'
import { formatStageDuration } from '@/features/leads/lib/format-stage-duration'
import type { CrmReportRange } from '@/features/leads/reports/crm-pipeline-report.types'
import {
	CRM_STAGE_DETAIL_PAGE_SIZES,
} from '@/features/leads/reports/crm-stage-detail.types'
import { useCrmStageDetail } from '@/features/leads/reports/use-crm-stage-detail'
import { formatDateTimeBogota } from '@/features/shared/lib/format-date'

const cellClass = 'px-3 py-2 text-left'
const numberClass = 'px-3 py-2 text-right tabular-nums'
const count = new Intl.NumberFormat('es-CO')
const selectClass =
	'h-9 rounded-md border border-input bg-background px-3 text-sm'

/** Advisor view: one row per lead. Each name opens that lead's history. */
const NO_OWNERS: readonly number[] = []

export function CrmStageDetailSection({
	range,
	ownerIds = NO_OWNERS,
}: {
	range: CrmReportRange | null
	ownerIds?: readonly number[]
}) {
	const { state, page, setPage, pageSize, setPageSize, stage, setStage } =
		useCrmStageDetail(range, ownerIds)
	const [openIds, setOpenIds] = useState<number[]>([])
	const data = state.status === 'success' ? state.data : null
	const totalPages = data ? Math.max(1, Math.ceil(data.totalLeads / data.pageSize)) : 1

	function toggleLead(idLead: number) {
		setOpenIds((current) =>
			current.includes(idLead) ? current.filter((id) => id !== idLead) : [...current, idLead]
		)
	}

	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="text-base">Detalle por lead y etapa</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				<p className="text-sm text-muted-foreground">
					Cada fila es un lead en su último estado. Pulsa el nombre para abrir
					o cerrar sus etapas, tareas y casos.
				</p>
				<div className="flex flex-wrap items-end gap-3">
					<label className="space-y-1 text-sm">
						<span className="font-medium">Último estado</span>
						<select
							className={selectClass}
							aria-label="Último estado"
							value={stage ?? ''}
							onChange={(event) => setStage(event.target.value || null)}
						>
							<option value="">Todos</option>
							{(data?.stages ?? []).map((name) => (
								<option key={name} value={name}>
									{name}
								</option>
							))}
						</select>
					</label>
					<label className="space-y-1 text-sm">
						<span className="font-medium">Filas</span>
						<select
							className={selectClass}
							aria-label="Filas por página"
							value={pageSize}
							onChange={(event) => setPageSize(Number(event.target.value))}
						>
							{CRM_STAGE_DETAIL_PAGE_SIZES.map((size) => (
								<option key={size} value={size}>
									{size}
								</option>
							))}
						</select>
					</label>
				</div>
				{state.status === 'loading' && <Skeleton className="h-40 w-full" />}
				{state.status === 'error' && (
					<p role="alert" className="text-sm text-destructive">
						{state.error}
					</p>
				)}
				{data && data.leads.length === 0 && (
					<p className="text-sm text-muted-foreground">
						No hay leads para este filtro.
					</p>
				)}
				{data && data.leads.length > 0 && (
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead className="border-b text-xs text-muted-foreground">
								<tr>
									<th className={cellClass}>Asesor</th>
									<th className={cellClass}>Lead</th>
									<th className={cellClass}>Último estado</th>
									<th className={cellClass}>Entró</th>
									<th className={cellClass}>Salió</th>
									<th className={numberClass}>Tiempo</th>
								</tr>
							</thead>
							<tbody className="divide-y">
								{data.leads.map((lead) => {
									const current =
										lead.stays.find((stay) => stay.current) ?? lead.stays.at(-1)
									const open = openIds.includes(lead.idLead)
									return (
										<Fragment key={lead.idLead}>
											<tr className={open ? 'border-b-0' : undefined}>
												<td className={cellClass}>{lead.advisorName}</td>
												<td className={cellClass}>
													<button
														type="button"
														className="inline-flex items-center gap-1 text-left font-medium underline-offset-2 hover:underline"
														aria-expanded={open}
														aria-label={`Detalle de ${lead.leadName}`}
														onClick={() => toggleLead(lead.idLead)}
													>
														<ChevronDown
															className={`size-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
															aria-hidden
														/>
														{lead.leadName}
													</button>
												</td>
												<td className={cellClass}>{lead.currentStage}</td>
												<td className={cellClass}>
													{current
														? formatDateTimeBogota(current.enteredAt)
														: '—'}
												</td>
												<td className={cellClass}>En curso</td>
												<td className={numberClass}>
													{current
														? formatStageDuration(current.durationMs)
														: '—'}
												</td>
											</tr>
											{open ? (
												<tr>
													<td
														colSpan={6}
														className="bg-slate-50 px-3 py-2 dark:bg-slate-900/40"
													>
														<LeadDetailPanel
															leadName={lead.leadName}
															stays={lead.stays}
															tasks={lead.tasks}
															cases={lead.cases}
														/>
													</td>
												</tr>
											) : null}
										</Fragment>
									)
								})}
							</tbody>
						</table>
					</div>
				)}
				{data && data.totalLeads > 0 && (
					<div className="flex items-center justify-between gap-3">
						<p className="text-xs text-muted-foreground">
							{count.format(data.totalLeads)} leads · página {page} de {totalPages}
						</p>
						<div className="flex gap-2">
							<Button
								type="button"
								size="sm"
								variant="outline"
								disabled={page <= 1}
								onClick={() => setPage(page - 1)}
							>
								Anterior
							</Button>
							<Button
								type="button"
								size="sm"
								variant="outline"
								disabled={page >= totalPages}
								onClick={() => setPage(page + 1)}
							>
								Siguiente
							</Button>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	)
}

