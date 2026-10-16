'use client'

import { useEffect, useState } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import { failure, LOADING, success } from '../lib/async-state'
import { partnerApi } from '../lib/partner-api'
import type { PartnerDto } from '../types/partner.types'

/** Loads the partners list. `refresh` reloads without flashing the table. */
export function usePartners() {
	const [state, setState] = useState<AsyncState<PartnerDto[]>>(LOADING)

	async function load() {
		try {
			setState(success(await partnerApi.list()))
		} catch (error) {
			console.error('Error loading partners:', error)
			setState(failure(error, 'Error al cargar los partners'))
		}
	}

	useEffect(() => {
		let cancelled = false
		partnerApi
			.list()
			.then((partners) => {
				if (!cancelled) setState(success(partners))
			})
			.catch((error: unknown) => {
				console.error('Error loading partners:', error)
				if (!cancelled) setState(failure(error, 'Error al cargar los partners'))
			})
		return () => {
			cancelled = true
		}
	}, [])

	return { state, refresh: load }
}
