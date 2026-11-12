'use client'

import { useEffect, useState } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { ActivityFocus } from '@/features/leads/agenda/agenda.types'

export interface ActivityComment {
	id: number
	body: string
	createdAt: string
	authorName: string
}

const LOAD_ERROR = 'No fue posible cargar los comentarios.'
const SAVE_ERROR = 'No fue posible agregar el comentario.'

/** Comments written on one task or one support case. */
export function useActivityComments(focus: ActivityFocus, enabled: boolean) {
	const [state, setState] = useState<AsyncState<ActivityComment[]>>({ status: 'idle', data: undefined, error: '' })
	const [saving, setSaving] = useState(false)
	const [saveError, setSaveError] = useState('')

	useEffect(() => {
		if (!enabled) return
		let cancelled = false
		setState({ status: 'loading', data: undefined, error: '' })
		setSaveError('')
		fetch(`/api/crm/activity-comments?kind=${focus.kind}&id=${focus.id}`)
			.then(async (response) => {
				if (!response.ok) throw new Error('comments')
				const payload = (await response.json()) as ApiResponse<ActivityComment[]>
				if (!cancelled) setState({ status: 'success', data: payload.data ?? [], error: '' })
			})
			.catch(() => {
				if (!cancelled) setState({ status: 'error', data: undefined, error: LOAD_ERROR })
			})
		return () => {
			cancelled = true
		}
	}, [enabled, focus.kind, focus.id])

	async function addComment(body: string): Promise<boolean> {
		const trimmed = body.trim()
		if (!trimmed) return false
		setSaving(true)
		setSaveError('')
		const response = await fetch('/api/crm/activity-comments', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ kind: focus.kind, id: focus.id, body: trimmed }),
		})
		setSaving(false)
		if (!response.ok) {
			setSaveError(SAVE_ERROR)
			return false
		}
		setState((current) => {
			const previous = current.status === 'success' ? current.data : []
			return {
				status: 'success',
				error: '',
				data: [{ id: Date.now(), body: trimmed, createdAt: new Date().toISOString(), authorName: 'Tú' }, ...previous],
			}
		})
		return true
	}

	return { state, saving, saveError, addComment }
}
