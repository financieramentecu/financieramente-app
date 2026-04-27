'use client'

import { useState, useCallback } from 'react'
import { businessService } from '@/features/negocios/services/business.service'
import type { NegociosExportBody } from '@/features/negocios/types/business-api.types'

export function useBusinessExport() {
	const [isExporting, setIsExporting] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const clearError = useCallback(() => setError(null), [])

	const exportReport = useCallback(async (body: NegociosExportBody) => {
		setIsExporting(true)
		setError(null)

		const result = await businessService.exportReport(body)

		if (!result.ok) {
			setError(result.error)
		}

		setIsExporting(false)
		return result
	}, [])

	return {
		exportReport,
		isExporting,
		error,
		clearError,
	}
}
