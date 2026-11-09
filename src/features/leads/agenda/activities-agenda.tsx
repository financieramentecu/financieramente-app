'use client'

import { CalendarClock } from 'lucide-react'
import { Badge } from '@/features/shared/ui/badge'
import { Button } from '@/features/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card'
import { formatDateTimeBogota } from '@/features/shared/lib/format-date'
import { cn } from '@/lib/utils'
import type { AgendaBucket } from '@/features/leads/tasks/agenda-bucket-range'
import type { AgendaTaskDto } from '@/features/leads/agenda/agenda.types'
import { useActivityAgenda } from '@/features/leads/agenda/use-activity-agenda'
import { TASK_TYPE_LABELS } from '@/features/leads/agenda/task-type-labels'

const SECTIONS: { bucket: AgendaBucket; title: string; empty: string }[] = [
	{ bucket: 'overdue', title: 'Vencidas', empty: 'No tienes actividades vencidas.' },
	{ bucket: 'today', title: 'Hoy', empty: 'No tienes actividades para hoy.' },
	{ bucket: 'upcoming', title: 'Próximas', empty: 'No tienes actividades próximas.' },
	{ bucket: 'done', title: 'Completadas (7 días)', empty: 'Aún no completas actividades esta semana.' },
]

function AgendaRow({
	task,
	onOpenLead,
	onComplete,
}: {
	task: AgendaTaskDto
	onOpenLead: (idLead: number) => void
	onComplete: (idLeadTask: number) => void
}) {
	const isOpen = task.status === 'OPEN'
	const when = isOpen
		? task.dueAt
			? formatDateTimeBogota(task.dueAt)
			: 'Sin fecha'
		: `Completada ${formatDateTimeBogota(task.completedAt)}`
	return (
		<li className="flex items-center justify-between gap-3 py-2">
			<div className="min-w-0 space-y-0.5">
				<p className="flex items-center gap-2 text-sm font-medium">
					<Badge variant="outline">{TASK_TYPE_LABELS[task.type]}</Badge>
					<span className="truncate">{task.title}</span>
				</p>
				<p className="text-xs text-muted-foreground">
					<button type="button" className="underline-offset-2 hover:underline" onClick={() => onOpenLead(task.idLead)}>
						{task.leadName}
					</button>
					{' · '}
					{when}
				</p>
			</div>
			{isOpen && (
				<Button type="button" size="sm" variant="outline" onClick={() => onComplete(task.idLeadTask)} aria-label={`Completar ${task.title}`}>
					Completar
				</Button>
			)}
		</li>
	)
}

/** "Mis actividades" agenda (Odoo Activities / EspoCRM Activities dashlet). */
export function ActivitiesAgenda({ onOpenLead }: { onOpenLead: (idLead: number) => void }) {
	const { state, actionError, complete } = useActivityAgenda()

	if (state.status === 'loading' || state.status === 'idle') {
		return <p role="status" className="text-sm text-muted-foreground">Cargando tus actividades…</p>
	}
	if (state.status === 'error') {
		return <p role="alert" className="text-sm text-destructive">{state.error}</p>
	}

	return (
		<div className="space-y-4">
			{actionError && <p role="alert" className="text-sm text-destructive">{actionError}</p>}
			<div className="grid gap-4 lg:grid-cols-2">
				{SECTIONS.map((section) => {
					const tasks = state.data[section.bucket]
					return (
						<Card key={section.bucket} aria-labelledby={`agenda-${section.bucket}`}>
							<CardHeader className="pb-2">
								<CardTitle id={`agenda-${section.bucket}`} className={cn('flex items-center gap-2 text-base', section.bucket === 'overdue' && tasks.length > 0 && 'text-destructive')}>
									<CalendarClock className="size-4" aria-hidden />
									{section.title}
									<span className="text-sm font-normal text-muted-foreground">({tasks.length})</span>
								</CardTitle>
							</CardHeader>
							<CardContent>
								{tasks.length === 0 ? (
									<p className="text-sm text-muted-foreground">{section.empty}</p>
								) : (
									<ul className="divide-y divide-border">
										{tasks.map((task) => (
											<AgendaRow key={task.idLeadTask} task={task} onOpenLead={onOpenLead} onComplete={(id) => void complete(id)} />
										))}
									</ul>
								)}
							</CardContent>
						</Card>
					)
				})}
			</div>
		</div>
	)
}
