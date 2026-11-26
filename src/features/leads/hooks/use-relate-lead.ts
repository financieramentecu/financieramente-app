import { useState } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { LeadCandidate, LeadRelationSummary } from '@/features/leads/types/lead-link.types'

export interface RelatedLeadResult {
	relation: LeadRelationSummary
	idUser: number | null
	ownerName: string | null
}

const IDLE: AsyncState<RelatedLeadResult> = { status: 'idle', data: undefined, error: '' }

/** Links the open lead to another lead of the same person. Origin is optional. */
export function useRelateLead() {
	const [state, setState] = useState<AsyncState<RelatedLeadResult>>(IDLE)

	async function relate(
		idLead: number,
		idRelatedLead: number,
		idClientOrigin: number | null
	): Promise<RelatedLeadResult | null> {
		setState({ status: 'loading', data: undefined, error: '' })
		try {
			const response = await fetch(`/api/leads/${idLead}/relation`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					idRelatedLead,
					...(idClientOrigin != null ? { idClientOrigin } : {}),
				}),
			})
			const body = (await response.json()) as {
				data?: RelatedLeadResult | null
				error?: string
			}
			if (!response.ok || !body.data) {
				setState({
					status: 'error',
					data: undefined,
					error: body.error || 'No fue posible relacionar el lead',
				})
				return null
			}
			setState({ status: 'success', data: body.data, error: '' })
			return body.data
		} catch {
			setState({
				status: 'error',
				data: undefined,
				error: 'No fue posible relacionar el lead',
			})
			return null
		}
	}

	return { state, relate }
}

export async function fetchLeadCandidates(idLead: number, query: string): Promise<LeadCandidate[]> {
	const params = new URLSearchParams({ q: query, exclude: String(idLead) })
	const response = await fetch(`/api/leads/candidates?${params.toString()}`)
	const body = (await response.json()) as { data?: LeadCandidate[] | null; error?: string }
	if (!response.ok || !body.data) {
		throw new Error(body.error || 'No fue posible buscar leads')
	}
	return body.data
}

export async function fetchOriginOptions(): Promise<Array<{ idClientOrigin: number; name: string }>> {
	const response = await fetch('/api/crm/origins')
	const body = (await response.json()) as {
		data?: Array<{ idClientOrigin: number; name: string }> | null
	}
	if (!response.ok || !body.data) return []
	return body.data
}
