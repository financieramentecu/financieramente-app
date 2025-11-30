'use client'

import { useState, useEffect } from 'react'
import { companyApi } from '../lib/company-api'
import type { Company, CompanyFilters } from '../types/company.types'

export function useCompanies(filters?: CompanyFilters) {
	const [companies, setCompanies] = useState<Company[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<Error | null>(null)

	useEffect(() => {
		loadCompanies()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filters?.search, filters?.status])

	const loadCompanies = async () => {
		try {
			setIsLoading(true)
			setError(null)
			const data = await companyApi.getCompanies(filters)
			setCompanies(data)
		} catch (err) {
			const error = err instanceof Error ? err : new Error('Error desconocido')
			setError(error)
			console.error('Error loading companies:', error)
		} finally {
			setIsLoading(false)
		}
	}

	return {
		companies,
		isLoading,
		error,
		refreshCompanies: loadCompanies,
	}
}
