'use client'

import { useCallback, useEffect, useState } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import { failure, LOADING, success } from '@/features/shared/lib/async-state'
import { roleApi } from '../lib/role-api'
import type { RoleOverview } from '../types/role.types'

/** Loads the roles list; `refresh` reloads without flashing the table. */
export function useRoles() {
	const [state, setState] = useState<AsyncState<RoleOverview[]>>(LOADING)

	const refresh = useCallback(async () => {
		try {
			setState(success(await roleApi.list()))
		} catch (error) {
			console.error('Error loading roles:', error)
			setState(failure(error, 'Error al cargar los roles'))
		}
	}, [])

	useEffect(() => {
		let cancelled = false
		roleApi
			.list()
			.then((roles) => {
				if (!cancelled) setState(success(roles))
			})
			.catch((error: unknown) => {
				console.error('Error loading roles:', error)
				if (!cancelled) setState(failure(error, 'Error al cargar los roles'))
			})
		return () => {
			cancelled = true
		}
	}, [])

	return { state, refresh }
}
