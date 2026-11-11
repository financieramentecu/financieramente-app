'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { AgendaBucket } from '@/features/leads/tasks/agenda-bucket-range'
import type { ActivityBoardCaseDto, ActivityBoardDto, ActivityBoardTaskDto, ActivityFocus } from '@/features/leads/agenda/agenda.types'
import { activityBucket, dueAtForActivityBucket } from '@/features/leads/agenda/activity-bucket'
import { fetchActivityBoard, moveCase, moveTask } from '@/features/leads/agenda/agenda-api'

const LOAD_ERROR = 'No fue posible cargar las actividades. Inténtalo de nuevo.'

function withTaskBucket(task: ActivityBoardTaskDto, bucket: AgendaBucket, now: Date): ActivityBoardTaskDto {
	if (bucket === 'done') return { ...task, status: 'DONE', completedAt: now.toISOString() }
	return { ...task, status: 'OPEN', completedAt: null, dueAt: dueAtForActivityBucket(bucket, now).toISOString() }
}

function withCaseBucket(supportCase: ActivityBoardCaseDto, bucket: AgendaBucket, now: Date): ActivityBoardCaseDto {
	if (bucket === 'done') return { ...supportCase, status: 'RESOLVED', resolvedAt: now.toISOString() }
	return { ...supportCase, status: 'OPEN', resolvedAt: null, dueAt: dueAtForActivityBucket(bucket, now).toISOString() }
}

/** Tasks and cases of the viewer hierarchy, grouped later into the four time columns. */
export function useActivityBoard(ownerIds: number[], paused = false) {
	const ownerKey = ownerIds.join(',')
	const [state, setState] = useState<AsyncState<ActivityBoardDto>>({ status: 'loading', data: undefined, error: '' })

	useEffect(() => {
		if (paused) return
		let cancelled = false
		setState((current) => (current.status === 'success' ? current : { status: 'loading', data: undefined, error: '' }))
		fetchActivityBoard(ownerIds)
			.then((data) => {
				if (!cancelled) setState({ status: 'success', data, error: '' })
			})
			.catch(() => {
				if (!cancelled) setState({ status: 'error', data: undefined, error: LOAD_ERROR })
			})
		return () => {
			cancelled = true
		}
		// ownerKey is the stable identity of ownerIds.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ownerKey, paused])

	function reload() {
		setState((current) => (current.status === 'success' ? current : { status: 'loading', data: undefined, error: '' }))
		fetchActivityBoard(ownerIds)
			.then((data) => setState({ status: 'success', data, error: '' }))
			.catch(() => setState({ status: 'error', data: undefined, error: LOAD_ERROR }))
	}

	async function place(focus: ActivityFocus, bucket: AgendaBucket) {
		const now = new Date()
		let moved = false
		setState((current) => {
			if (current.status !== 'success') return current
			if (focus.kind === 'task') {
				const task = current.data.tasks.find((item) => item.idLeadTask === focus.id)
				if (!task || activityBucket(task, now) === bucket) return current
				moved = true
				return {
					status: 'success',
					error: '',
					data: {
						...current.data,
						tasks: current.data.tasks.map((item) => (item.idLeadTask === focus.id ? withTaskBucket(item, bucket, now) : item)),
					},
				}
			}
			const supportCase = current.data.cases.find((item) => item.idLeadSupportCase === focus.id)
			if (!supportCase || activityBucket(caseAsTask(supportCase), now) === bucket) return current
			moved = true
			return {
				status: 'success',
				error: '',
				data: {
					...current.data,
					cases: current.data.cases.map((item) => (item.idLeadSupportCase === focus.id ? withCaseBucket(item, bucket, now) : item)),
				},
			}
		})
		if (!moved) return
		try {
			if (focus.kind === 'task') await moveTask(focus.id, bucket)
			else await moveCase(focus.id, bucket)
			toast.success('Actividad actualizada')
		} catch {
			reload()
			toast.error('No se guardó el cambio', { description: 'No fue posible mover la actividad.' })
		}
	}

	return { state, place, reload }
}

export function caseAsTask(supportCase: Pick<ActivityBoardCaseDto, 'status' | 'dueAt' | 'resolvedAt'>) {
	const closed = supportCase.status === 'RESOLVED' || supportCase.status === 'CLOSED'
	return {
		status: closed ? ('DONE' as const) : ('OPEN' as const),
		dueAt: supportCase.dueAt,
		completedAt: supportCase.resolvedAt,
	}
}
