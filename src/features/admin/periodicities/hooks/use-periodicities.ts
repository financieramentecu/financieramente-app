'use client'

import { useState, useEffect } from 'react'
import { periodicityApi } from '../lib/periodicity-api'
import type {
	Periodicity,
	PeriodicityFilters,
} from '../types/periodicity.types'

export function usePeriodicities(filters?: PeriodicityFilters) {
	const [periodicities, setPeriodicities] = useState<Periodicity[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<Error | null>(null)

	useEffect(() => {
		loadPeriodicities()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filters?.search, filters?.status])

	const loadPeriodicities = async () => {
		try {
			setIsLoading(true)
			setError(null)
			const data = await periodicityApi.getPeriodicities(filters)
			setPeriodicities(data)
		} catch (err) {
			const error = err instanceof Error ? err : new Error('Error desconocido')
			setError(error)
			console.error('Error loading periodicities:', error)
		} finally {
			setIsLoading(false)
		}
	}

	return {
		periodicities,
		isLoading,
		error,
		refreshPeriodicities: loadPeriodicities,
	}
}
