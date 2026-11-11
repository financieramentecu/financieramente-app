'use client'

import { Fragment, useState, type ReactNode } from 'react'
import { Button } from '@/features/shared/ui/button'
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from '@/features/shared/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/features/shared/ui/popover'
import { Skeleton } from '@/features/shared/ui/skeleton'
import { formatStageDuration } from '@/features/leads/lib/format-stage-duration'
import type { CrmReportRange } from '@/features/leads/reports/crm-pipeline-report.types'
import {
	CRM_STAGE_DETAIL_PAGE_SIZES,
	type CrmStageDetailCase,
	type CrmStageDetailLead,
	type CrmStageDetailTask,
} from '@/features/leads/reports/crm-stage-detail.types'
import { useCrmStageDetail } from '@/features/leads/reports/use-crm-stage-detail'
import { formatDateTimeBogota } from '@/features/shared/lib/format-date'

const cellClass = 'px-3 py-2 text-left'
const numberClass = 'px-3 py-2 text-right tabular-nums'
const count = new Intl.NumberFormat('es-CO')
const selectClass =
	'h-9 rounded-md border border-input bg-background px-3 text-sm'

function taskLabel(task: CrmStageDetailTask): string {
	if (task.status === 'DONE') {
		return task.completedAt
			? `Completada · ${formatDateTimeBogota(task.completedAt)}`
			: 'Completada'
	}
	if (task.status === 'CANCELLED') {
		return task.completedAt
			? `Cancelada · ${formatDateTimeBogota(task.completedAt)}`
			: 'Cancelada'
	}
	return 'Abierta'
}

function caseLabel(supportCase: CrmStageDetailCase): string {
	if (supportCase.status === 'RESOLVED') {
		return supportCase.resolvedAt
			? `Resuelto · ${formatDateTimeBogota(supportCase.resolvedAt)}`
			: 'Resuelto'
	}
	if (supportCase.status === 'CLOSED') {
		return supportCase.resolvedAt
			? `Cerrado · ${formatDateTimeBogota(supportCase.resolvedAt)}`
			: 'Cerrado'
	}
	if (supportCase.status === 'IN_PROGRESS') return 'En proceso'
	if (supportCase.status === 'WAITING') return 'En espera'
	return 'Abierto'
}

function HistoryList({
	title,
	empty,
	children,
}: {
	title: string
	empty: string
	children: ReactNode
}) {
	return (
		<div className="space-y-1">
			<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
				{title}
			</p>
			{children ?? <p className="text-sm text-muted-foreground">{empty}</p>}
		</div>
	)
}

function LeadHistory({ lead }: { lead: CrmStageDetailLead }) {
	return (
		<div className="max-h-80 space-y-3 overflow-y-auto">
			<HistoryList title="Etapas" empty="Sin etapas">
				{lead.stays.length > 0 ? (
					<ul className="space-y-1 text-sm">
						{lead.stays.map((stay) => (
							<li key={`${stay.stageName}-${stay.enteredAt}`}>
								<span className="font-medium">{stay.stageName}</span>
								<span className="text-muted-foreground">
									{' '}
									· {formatStageDuration(stay.durationMs)}
									{stay.current ? ' · En curso' : ''}
								</span>
							</li>
						))}
					</ul>
				) : null}
			</HistoryList>
			<HistoryList title="Tareas" empty="Sin tareas">
				{lead.tasks.length > 0 ? (
					<ul className="space-y-1 text-sm">
						{lead.tasks.map((task) => (
							<li key={`${task.title}-${task.completedAt ?? task.status}`}>
								<span className="font-medium">{task.title}</span>
								<span className="text-muted-foreground"> · {taskLabel(task)}</span>
							</li>
						))}
					</ul>
				) : null}
			</HistoryList>
			<HistoryList title="Casos" empty="Sin casos">
				{lead.cases.length > 0 ? (
					<ul className="space-y-1 text-sm">
						{lead.cases.map((supportCase) => (
							<li key={`${supportCase.subject}-${supportCase.resolvedAt ?? supportCase.status}`}>
								<span className="font-medium">{supportCase.subject}</span>
								<span className="text-muted-foreground">
									{' '}
									· {caseLabel(supportCase)}
								</span>
							</li>
						))}
					</ul>
				) : null}
			</HistoryList>
		</div>
	)
}

function LeadName({ lead }: { lead: CrmStageDetailLead }) {
	const [open, setOpen] = useState(false)
	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<button
					type="button"
					className="text-left font-medium underline-offset-2 hover:underline"
					aria-label={`Historial de ${lead.leadName}`}
					onMouseEnter={() => setOpen(true)}
					onMouseLeave={() => setOpen(false)}
				>
					{lead.leadName}
				</button>
			</PopoverTrigger>
			<PopoverContent
				align="start"
				className="w-96"
				onMouseEnter={() => setOpen(true)}
				onMouseLeave={() => setOpen(false)}
			>
				<p className="mb-2 text-sm font-semibold">{lead.leadName}</p>
				<LeadHistory lead={lead} />
			</PopoverContent>
		</Popover>
	)
}

function LeadCascade({ lead }: { lead: CrmStageDetailLead }) {
	return (
		<tr>
			<td colSpan={6} className="bg-slate-50 px-3 py-2 dark:bg-slate-900/40">
				<ol
					aria-label={`Etapas de ${lead.leadName}`}
					className="ml-6 space-y-1 border-l-2 border-slate-300 py-1 pl-4 dark:border-slate-600"
				>
					{lead.stays.map((stay) => (
						<li
							key={`${lead.idLead}-${stay.stageName}-${stay.enteredAt}`}
							className="relative rounded-md bg-slate-200/80 px-3 py-1.5 transition-colors hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700"
						>
							<span
								className="absolute -left-[21px] top-1.5 size-2.5 rounded-full border-2 border-background bg-primary"
								aria-hidden
							/>
							<p className="text-sm font-medium text-foreground">{stay.stageName}</p>
							<p className="text-xs text-muted-foreground">
								{formatDateTimeBogota(stay.enteredAt)}
								{' → '}
								{stay.current ? 'En curso' : formatDateTimeBogota(stay.leftAt)}
								{' · '}
								{formatStageDuration(stay.durationMs)}
							</p>
						</li>
					))}
				</ol>
			</td>
		</tr>
	)
}

/** Advisor view: one row per lead, filtered by its last stage, expandable to the full history. */
export function CrmStageDetailSection({ range }: { range: CrmReportRange | null }) {
	const { state, page, setPage, pageSize, setPageSize, stage, setStage, view, setView } =
		useCrmStageDetail(range)
	const data = state.status === 'success' ? state.data : null
	const totalPages = data ? Math.max(1, Math.ceil(data.totalLeads / data.pageSize)) : 1
	const history = view === 'history'
	const stageLabel = history ? 'Etapa del historial' : 'Último estado'

	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="text-base">Detalle por lead y etapa</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				<p className="text-sm text-muted-foreground">
					Cada fila es un lead en su último estado. Pasa el cursor sobre el
					nombre para ver tareas, casos y cuánto duró cada etapa. Desacoplar
					abre, dentro de ese lead, la cascada de etapas por las que pasó.
				</p>
				<div className="flex flex-wrap items-end gap-3">
					<label className="space-y-1 text-sm">
						<span className="font-medium">{stageLabel}</span>
						<select
							className={selectClass}
							aria-label={stageLabel}
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
					<div className="flex gap-2" role="group" aria-label="Agrupar detalle">
						<ViewButton
							active={view === 'current'}
							onClick={() => setView('current')}
						>
							Agrupar
						</ViewButton>
						<ViewButton
							active={view === 'history'}
							onClick={() => setView('history')}
						>
							Desacoplar historial
						</ViewButton>
					</div>
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
									return (
										<Fragment key={lead.idLead}>
											<tr className={history ? 'border-b-0' : undefined}>
												<td className={cellClass}>{lead.advisorName}</td>
												<td className={cellClass}>
													<LeadName lead={lead} />
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
											{history ? <LeadCascade lead={lead} /> : null}
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

function ViewButton({
	active,
	onClick,
	children,
}: {
	active: boolean
	onClick: () => void
	children: ReactNode
}) {
	return (
		<Button
			type="button"
			size="sm"
			variant={active ? 'default' : 'outline'}
			aria-pressed={active}
			onClick={onClick}
		>
			{children}
		</Button>
	)
}
