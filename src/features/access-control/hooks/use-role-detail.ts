'use client'

import { useEffect, useState } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import { failure, LOADING, success } from '@/features/shared/lib/async-state'
import { roleApi } from '../lib/role-api'
import type { RoleDetail } from '../types/role.types'

export function useRoleDetail(id: number) {
	const [state, setState] = useState<AsyncState<RoleDetail>>(LOADING)

	useEffect(() => {
		let cancelled = false
		roleApi
			.detail(id)
			.then((detail) => {
				if (!cancelled) setState(success(detail))
			})
			.catch((error: unknown) => {
				console.error('Error loading role:', error)
				if (!cancelled) setState(failure(error, 'Error al cargar el rol'))
			})
		return () => {
			cancelled = true
		}
	}, [id])

	return state
}
