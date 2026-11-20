import type { ReactNode } from 'react'
import { formatStageDuration } from '@/features/leads/lib/format-stage-duration'
import type {
	CrmStageDetailCase,
	CrmStageDetailStay,
	CrmStageDetailTask,
} from '@/features/leads/reports/crm-stage-detail.types'
import { formatDateTimeBogota } from '@/features/shared/lib/format-date'

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

/** Stages, tasks and cases of one lead, shown under its table row. */
export function LeadDetailPanel({
	leadName,
	stays,
	tasks,
	cases,
}: {
	leadName: string
	stays: readonly CrmStageDetailStay[]
	tasks: readonly CrmStageDetailTask[]
	cases: readonly CrmStageDetailCase[]
}) {
	return (
		<div className="space-y-3">
			<HistoryList title="Tareas" empty="Sin tareas">
				{tasks.length > 0 ? (
					<ul className="space-y-1 text-sm">
						{tasks.map((task) => (
							<li key={`${task.title}-${task.completedAt ?? task.status}`}>
								<span className="font-medium">{task.title}</span>
								<span className="text-muted-foreground"> · {taskLabel(task)}</span>
							</li>
						))}
					</ul>
				) : null}
			</HistoryList>
			<HistoryList title="Casos" empty="Sin casos">
				{cases.length > 0 ? (
					<ul className="space-y-1 text-sm">
						{cases.map((supportCase) => (
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
			<div className="space-y-1">
				<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
					Etapas
				</p>
				{stays.length === 0 ? (
					<p className="text-sm text-muted-foreground">Sin etapas</p>
				) : (
					<ol
						aria-label={`Etapas de ${leadName}`}
						className="ml-6 space-y-1 border-l-2 border-slate-300 py-1 pl-4 dark:border-slate-600"
					>
						{stays.toReversed().map((stay) => (
							<li
								key={`${stay.stageName}-${stay.enteredAt}`}
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
				)}
			</div>
		</div>
	)
}
