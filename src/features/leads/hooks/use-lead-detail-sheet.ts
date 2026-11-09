'use client'

import * as React from 'react'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { LeadDetail } from '@/features/leads/types/lead.types'

/** Loads a lead by id and controls the detail sheet that shows it. */
export function useLeadDetailSheet() {
	const [lead, setLead] = React.useState<LeadDetail | null>(null)
	const [open, setOpen] = React.useState(false)

	async function openLead(idLead: number) {
		try {
			const response = await fetch(`/api/leads/${idLead}`)
			const body: ApiResponse<LeadDetail> = await response.json()
			if (!('error' in body) && body.data) {
				setLead(body.data)
				setOpen(true)
			}
		} catch {
			// The sheet simply does not open.
		}
	}

	return { lead, open, setOpen, openLead }
}
