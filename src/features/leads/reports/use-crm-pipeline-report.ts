'use client'

import * as React from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { CrmPipelineReport, CrmReportRange } from '@/features/leads/reports/crm-pipeline-report.types'
import { fetchCrmPipelineReport } from '@/features/leads/reports/crm-report-api'

const FALLBACK_ERROR = 'No fue posible cargar el reporte. Inténtalo de nuevo.'

function toErrorMessage(cause: unknown): string {
	return cause instanceof Error && cause.message ? cause.message : FALLBACK_ERROR
}

/** Pipeline report for a range; starts with the server default range. `range` is the last range served. */
export function useCrmPipelineReport() {
	const [state, setState] = React.useState<AsyncState<CrmPipelineReport>>({ status: 'loading', data: undefined, error: '' })
	const [range, setRange] = React.useState<CrmReportRange | null>(null)
	const requestId = React.useRef(0)

	async function load(range?: CrmReportRange) {
		const id = ++requestId.current
		setState({ status: 'loading', data: undefined, error: '' })
		try {
			const data = await fetchCrmPipelineReport(range)
			if (id !== requestId.current) return
			setState({ status: 'success', data, error: '' })
			setRange(data.range)
		} catch (cause) {
			if (id === requestId.current) setState({ status: 'error', data: undefined, error: toErrorMessage(cause) })
		}
	}

	React.useEffect(() => {
		void load()
		return () => {
			requestId.current += 1
		}
		// Initial load only.
	}, [])

	return { state, range, load }
}
