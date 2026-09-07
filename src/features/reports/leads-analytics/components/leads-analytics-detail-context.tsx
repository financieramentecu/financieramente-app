'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { LeadDetailSheet } from '@/features/leads/components/lead-detail-sheet'
import { useLeadsAnalyticsLeadDetail } from '../hooks/use-leads-analytics-lead-detail'
import { LEADS_ANALYTICS_UI } from '../lib/ui-copy'

interface LeadsAnalyticsDetailContextValue {
	readonly openLead: (idLead: number) => void
}

const LeadsAnalyticsDetailContext =
	createContext<LeadsAnalyticsDetailContextValue | null>(null)

export function LeadsAnalyticsDetailProvider({
	children,
}: {
	children: ReactNode
}) {
	const { state, openLead, closeLead } = useLeadsAnalyticsLeadDetail()

	return (
		<LeadsAnalyticsDetailContext.Provider value={{ openLead }}>
			{children}
			{state.status === 'loading' ? (
				<p role="status" className="sr-only">
					{LEADS_ANALYTICS_UI.LOADING}
				</p>
			) : null}
			<LeadDetailSheet
				lead={state.status === 'success' ? state.data : null}
				open={state.status === 'success'}
				onOpenChange={(next) => {
					if (!next) closeLead()
				}}
			/>
		</LeadsAnalyticsDetailContext.Provider>
	)
}

export function useLeadsAnalyticsDetail(): LeadsAnalyticsDetailContextValue {
	const ctx = useContext(LeadsAnalyticsDetailContext)
	if (!ctx) {
		throw new Error(
			'useLeadsAnalyticsDetail must be used within LeadsAnalyticsDetailProvider'
		)
	}
	return ctx
}
