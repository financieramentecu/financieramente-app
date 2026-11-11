'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { AgendaBucket } from '@/features/leads/tasks/agenda-bucket-range'
import type { ActivityBoardTaskDto } from '@/features/leads/agenda/agenda.types'
import { activityBucket, dueAtForActivityBucket } from '@/features/leads/agenda/activity-bucket'
import { fetchActivityBoard, moveTask } from '@/features/leads/agenda/agenda-api'

const LOAD_ERROR = 'No fue posible cargar las actividades. Inténtalo de nuevo.'

function withBucket(task: ActivityBoardTaskDto, bucket: AgendaBucket, now: Date): ActivityBoardTaskDto {
	if (bucket === 'done') {
		return { ...task, status: 'DONE', completedAt: now.toISOString() }
	}
	return { ...task, status: 'OPEN', completedAt: null, dueAt: dueAtForActivityBucket(bucket, now).toISOString() }
}

/** Agenda tasks of the viewer hierarchy, grouped later into the four time columns. */
export function useActivityBoard(ownerIds: number[], paused = false) {
	const ownerKey = ownerIds.join(',')
	const [state, setState] = useState<AsyncState<ActivityBoardTaskDto[]>>({ status: 'loading', data: undefined, error: '' })

	useEffect(() => {
		if (paused) return
		let cancelled = false
		setState({ status: 'loading', data: undefined, error: '' })
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

	async function place(idLeadTask: number, bucket: AgendaBucket) {
		const now = new Date()
		let snapshot: ActivityBoardTaskDto | null = null
		setState((current) => {
			if (current.status !== 'success') return current
			const task = current.data.find((item) => item.idLeadTask === idLeadTask)
			if (!task || activityBucket(task, now) === bucket) return current
			snapshot = task
			return {
				status: 'success',
				error: '',
				data: current.data.map((item) => (item.idLeadTask === idLeadTask ? withBucket(item, bucket, now) : item)),
			}
		})
		if (!snapshot) return
		const previous = snapshot
		try {
			await moveTask(idLeadTask, bucket)
			toast.success('Actividad actualizada')
		} catch {
			setState((current) => {
				if (current.status !== 'success') return current
				return {
					status: 'success',
					error: '',
					data: current.data.map((item) => {
						if (item.idLeadTask !== idLeadTask) return item
						return activityBucket(item, new Date()) === bucket ? previous : item
					}),
				}
			})
			toast.error('No se guardó el cambio', { description: 'No fue posible mover la actividad.' })
		}
	}

	return { state, place }
}
