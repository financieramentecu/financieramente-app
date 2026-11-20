'use client'

import { useEffect, useState } from 'react'
import { LeadDetailPanel } from '@/features/leads/components/lead-detail-panel'
import type {
	CrmStageDetailCase,
	CrmStageDetailStay,
	CrmStageDetailTask,
} from '@/features/leads/reports/crm-stage-detail.types'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { LeadStageStayDto } from '@/features/leads/types/lead-stage-stay.types'

interface LeadAccordionDetail {
	stays: CrmStageDetailStay[]
	tasks: CrmStageDetailTask[]
	cases: CrmStageDetailCase[]
}

const LOADING: AsyncState<LeadAccordionDetail> = {
	status: 'loading',
	data: undefined,
	error: '',
}

async function readList<T>(response: Response): Promise<T[]> {
	if (!response.ok) return []
	const body = (await response.json()) as { data?: T[] }
	return body.data ?? []
}

function toStay(stay: LeadStageStayDto): CrmStageDetailStay {
	return {
		stageName: stay.columnName,
		enteredAt: stay.enteredAt,
		leftAt: stay.leftAt,
		durationMs: stay.durationMs,
		current: stay.current,
	}
}

/** Loads one lead's stages, tasks and cases when its table row is open. */
export function LeadTableDetail({ idLead, leadName }: { idLead: number; leadName: string }) {
	const [state, setState] = useState<AsyncState<LeadAccordionDetail>>(LOADING)

	useEffect(() => {
		let cancelled = false
		setState(LOADING)
		Promise.all([
			fetch(`/api/leads/${idLead}/stage-history`),
			fetch(`/api/leads/${idLead}/tasks`),
			fetch(`/api/leads/${idLead}/cases`),
		])
			.then(async ([stages, tasks, cases]) => {
				if (!stages.ok) throw new Error('No fue posible cargar el detalle del lead.')
				const stays = await readList<LeadStageStayDto>(stages)
				const taskRows = await readList<CrmStageDetailTask>(tasks)
				const caseRows = await readList<CrmStageDetailCase>(cases)
				if (!cancelled) {
					setState({
						status: 'success',
						error: '',
						data: {
							stays: stays.map(toStay),
							tasks: taskRows,
							cases: caseRows,
						},
					})
				}
			})
			.catch(() => {
				if (!cancelled) {
					setState({
						status: 'error',
						data: undefined,
						error: 'No fue posible cargar el detalle del lead.',
					})
				}
			})
		return () => {
			cancelled = true
		}
	}, [idLead])

	if (state.status === 'loading') {
		return <p className="text-sm text-muted-foreground">Cargando detalle…</p>
	}
	if (state.status === 'error') {
		return (
			<p role="alert" className="text-sm text-destructive">
				{state.error}
			</p>
		)
	}
	if (state.status !== 'success') return null
	return (
		<LeadDetailPanel
			leadName={leadName}
			stays={state.data.stays}
			tasks={state.data.tasks}
			cases={state.data.cases}
		/>
	)
}
