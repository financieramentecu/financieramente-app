'use client'

import { useState, useEffect } from 'react'
import { currencyApi } from '../lib/currency-api'
import type { Currency, CurrencyFilters } from '../types/currency.types'

export function useCurrencies(filters?: CurrencyFilters) {
	const [currencies, setCurrencies] = useState<Currency[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<Error | null>(null)

	useEffect(() => {
		loadCurrencies()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filters?.search, filters?.status])

	const loadCurrencies = async () => {
		try {
			setIsLoading(true)
			setError(null)
			const data = await currencyApi.getCurrencies(filters)
			setCurrencies(data)
		} catch (err) {
			const error = err instanceof Error ? err : new Error('Error desconocido')
			setError(error)
			console.error('Error loading currencies:', error)
		} finally {
			setIsLoading(false)
		}
	}

	return {
		currencies,
		isLoading,
		error,
		refreshCurrencies: loadCurrencies,
	}
}
