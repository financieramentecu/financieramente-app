'use client'

import { useEffect, useState } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import { fetchTaskNoticeSettings, updateTaskNoticeSettings } from '@/features/leads/tasks/task-notice-settings-api'
import type { TaskNoticeSetting } from '@/features/leads/tasks/task-notice.schema'

/** Anticipation days for upcoming CRM task notices. Loads when the dialog opens. */
export function useTaskNoticeSettings(enabled: boolean) {
	const [state, setState] = useState<AsyncState<TaskNoticeSetting>>({ status: 'idle', data: undefined, error: '' })
	const [saving, setSaving] = useState(false)
	const [actionError, setActionError] = useState('')

	useEffect(() => {
		if (!enabled) return
		let cancelled = false
		setState({ status: 'loading', data: undefined, error: '' })
		void fetchTaskNoticeSettings()
			.then((data) => {
				if (!cancelled) setState({ status: 'success', data, error: '' })
			})
			.catch((cause: Error) => {
				if (!cancelled) setState({ status: 'error', data: undefined, error: cause.message })
			})
		return () => {
			cancelled = true
		}
	}, [enabled])

	async function save(anticipationDays: number): Promise<boolean> {
		setSaving(true)
		setActionError('')
		try {
			const data = await updateTaskNoticeSettings(anticipationDays)
			setState({ status: 'success', data, error: '' })
			return true
		} catch (cause) {
			setActionError((cause as Error).message)
			return false
		} finally {
			setSaving(false)
		}
	}

	return { state, saving, actionError, save }
}
