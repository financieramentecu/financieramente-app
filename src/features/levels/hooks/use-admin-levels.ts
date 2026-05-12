'use client'

import { useState, useEffect } from 'react'
import { levelApi } from '../lib/level-api'
import type { Level, LevelFilters } from '../types/level.types'

export function useAdminLevels(filters?: LevelFilters) {
	const [levels, setLevels] = useState<Level[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<Error | null>(null)

	useEffect(() => {
		loadLevels()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filters?.search, filters?.typeLevel, filters?.status])

	const loadLevels = async () => {
		try {
			setIsLoading(true)
			setError(null)
			const response = await levelApi.getLevels({
				...filters,
				pageSize: 1000,
			})

			if ('error' in response && response.error) {
				setError(new Error(response.error))
				return
			}

			setLevels(response.data?.levels ?? [])
		} catch (err) {
			const error = err instanceof Error ? err : new Error('Error desconocido')
			setError(error)
		} finally {
			setIsLoading(false)
		}
	}

	return {
		levels,
		isLoading,
		error,
		refreshLevels: loadLevels,
	}
}
