'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import type { LeadDetail } from '@/features/leads/types/lead.types'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import { fetchLeadDetail } from '../lib/leads-analytics-api'
import { LEADS_ANALYTICS_UI } from '../lib/ui-copy'

export interface UseLeadsAnalyticsLeadDetailResult {
	readonly state: AsyncState<LeadDetail>
	readonly openLead: (idLead: number) => void
	readonly closeLead: () => void
}

/**
 * Loads a single lead for the report detail sheet.
 */
export function useLeadsAnalyticsLeadDetail(): UseLeadsAnalyticsLeadDetailResult {
	const [state, setState] = useState<AsyncState<LeadDetail>>({
		status: 'idle',
		data: undefined,
		error: '',
	})

	const openLead = (idLead: number) => {
		setState({ status: 'loading', data: undefined, error: '' })

		void (async () => {
			try {
				const data = await fetchLeadDetail(idLead)
				setState({ status: 'success', data, error: '' })
			} catch (err) {
				const error =
					err instanceof Error
						? err.message
						: LEADS_ANALYTICS_UI.ERROR_LEAD_DETAIL
				setState({ status: 'error', data: undefined, error })
				toast.error(error)
			}
		})()
	}

	const closeLead = () => {
		setState({ status: 'idle', data: undefined, error: '' })
	}

	return { state, openLead, closeLead }
}
