import * as React from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { LeadCsvImportSummary } from '@/features/leads/types/lead-csv-import.types'
import { readWorkbookFromFile } from '@/features/load-file/lib/read-workbook'
import { parseLeadCsvFile } from '@/features/leads/lib/parse-lead-csv-file'

const initialState: AsyncState<LeadCsvImportSummary> = {
	status: 'idle',
	data: undefined,
	error: '',
}

/**
 * Drives the CSV import flow on `/admin/lead-funnel-columns`: client-side
 * parses the uploaded file (`readWorkbookFromFile` + `parseLeadCsvFile`,
 * transport only — validity is decided server-side) and POSTs the extracted
 * rows to `/api/leads/csv-import`. `AsyncState<LeadCsvImportSummary>`
 * surfaces idle -> loading -> success/error to the panel.
 */
export function useLeadCsvImport() {
	const [state, setState] = React.useState<AsyncState<LeadCsvImportSummary>>(initialState)

	const importFile = React.useCallback(async (file: File) => {
		setState({ status: 'loading', data: undefined, error: '' })

		try {
			const workbook = await readWorkbookFromFile(file)
			const parsed = parseLeadCsvFile(workbook)

			if (parsed.rejected) {
				setState({ status: 'error', data: undefined, error: parsed.reason })
				return
			}

			const response = await fetch('/api/leads/csv-import', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ rows: parsed.rows }),
			})
			const body: ApiResponse<LeadCsvImportSummary> = await response.json()

			if (!response.ok || 'error' in body) {
				setState({
					status: 'error',
					data: undefined,
					error: 'error' in body ? body.error : 'Error al importar los leads',
				})
				return
			}

			setState({ status: 'success', data: body.data, error: '' })
		} catch {
			setState({ status: 'error', data: undefined, error: 'Error al importar los leads' })
		}
	}, [])

	return { state, importFile }
}
