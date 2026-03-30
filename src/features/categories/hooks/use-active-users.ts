'use client'

import { useState, useEffect } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'

export interface ActiveUser {
	id: number
	name: string
	lastName: string
	email: string
}

interface UseActiveUsersReturn {
	state: AsyncState<ActiveUser[]>
}

export function useActiveUsers(): UseActiveUsersReturn {
	const [state, setState] = useState<AsyncState<ActiveUser[]>>({
		status: 'loading',
		data: undefined,
		error: '',
	})

	useEffect(() => {
		let cancelled = false

		const fetchUsers = async () => {
			setState({ status: 'loading', data: undefined, error: '' })
			try {
				const response = await fetch('/api/admin/users?status=active')
				const json = await response.json()

				if (cancelled) return

				if (!response.ok || !json.success) {
					setState({ status: 'error', data: undefined, error: json.error ?? 'Error al cargar usuarios' })
					return
				}

				setState({ status: 'success', data: json.data as ActiveUser[], error: '' })
			} catch {
				if (!cancelled) {
					setState({ status: 'error', data: undefined, error: 'Error al cargar usuarios' })
				}
			}
		}

		fetchUsers()
		return () => { cancelled = true }
	}, [])

	return { state }
}
