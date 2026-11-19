'use client'

import { useRef, useState } from 'react'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { LeadDetail } from '@/features/leads/types/lead.types'

const OPEN_ERROR = 'No fue posible abrir el lead. Inténtalo de nuevo.'

/** Loads a lead by id and controls the detail sheet that shows it. */
export function useLeadDetailSheet() {
	const [lead, setLead] = useState<LeadDetail | null>(null)
	const [open, setOpen] = useState(false)
	const [previewName, setPreviewName] = useState<string | null>(null)
	const [loadError, setLoadError] = useState<string | null>(null)
	const requestRef = useRef(0)
	const readyLeadId = useRef<number | null>(null)

	function openLead(idLead: number, leadName?: string) {
		setOpen(true)
		if (leadName) setPreviewName(leadName)
		if (readyLeadId.current === idLead) {
			setLoadError(null)
			return
		}
		const request = ++requestRef.current
		readyLeadId.current = null
		setLead(null)
		setLoadError(null)
		void loadLead(idLead, request)
	}

	async function loadLead(idLead: number, request: number) {
		try {
			const response = await fetch(`/api/leads/${idLead}`)
			const body = (await response.json()) as ApiResponse<LeadDetail>
			if (request !== requestRef.current) return
			if (!response.ok || !body.data || 'error' in body) {
				setLoadError(OPEN_ERROR)
				return
			}
			readyLeadId.current = idLead
			setLead(body.data)
		} catch {
			if (request === requestRef.current) setLoadError(OPEN_ERROR)
		}
	}

	return { lead, open, setOpen, openLead, previewName, loadError }
}
