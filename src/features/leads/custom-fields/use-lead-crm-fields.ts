'use client'

import * as React from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import { fetchTagOptions } from '@/features/leads/table/lead-table-api'
import type { LeadTagChip } from '@/features/leads/table/lead-table.types'
import type { CustomFieldDefinition, CustomFieldPatch } from '@/features/leads/custom-fields/custom-field.types'
import type { LeadCrmFields } from '@/features/leads/custom-fields/lead-crm-fields.service'
import { fetchCustomFields, fetchLeadCrmFields, saveLeadCrmFields, saveLeadTags } from '@/features/leads/custom-fields/crm-fields-api'

export interface LeadCrmFieldsData {
	fields: LeadCrmFields
	definitions: CustomFieldDefinition[]
	tagOptions: LeadTagChip[]
}

/** CRM-owned data of one lead (value, probability, custom fields, tags). */
export function useLeadCrmFields(idLead: number, initialTags: LeadTagChip[]) {
	const [state, setState] = React.useState<AsyncState<LeadCrmFieldsData>>({ status: 'loading', data: undefined, error: '' })
	const [tags, setTags] = React.useState<LeadTagChip[]>(initialTags)
	const [saving, setSaving] = React.useState(false)
	const [message, setMessage] = React.useState<{ kind: 'error' | 'success'; text: string } | null>(null)

	React.useEffect(() => {
		let cancelled = false
		setState({ status: 'loading', data: undefined, error: '' })
		Promise.all([fetchLeadCrmFields(idLead), fetchCustomFields(), fetchTagOptions()])
			.then(([fields, definitions, tagOptions]) => {
				if (!cancelled) setState({ status: 'success', data: { fields, definitions, tagOptions }, error: '' })
			})
			.catch((cause: Error) => !cancelled && setState({ status: 'error', data: undefined, error: cause.message }))
		return () => {
			cancelled = true
		}
	}, [idLead])

	async function save(patch: { estimatedValue: string | null; probability: number | null; customFields?: CustomFieldPatch }) {
		setSaving(true)
		setMessage(null)
		try {
			const fields = await saveLeadCrmFields(idLead, patch)
			setState((previous) => (previous.status === 'success' ? { ...previous, data: { ...previous.data, fields } } : previous))
			setMessage({ kind: 'success', text: 'Datos del CRM guardados.' })
		} catch (cause) {
			setMessage({ kind: 'error', text: (cause as Error).message })
		} finally {
			setSaving(false)
		}
	}

	async function updateTags(tagIds: number[]) {
		setMessage(null)
		try {
			setTags(await saveLeadTags(idLead, tagIds))
		} catch (cause) {
			setMessage({ kind: 'error', text: (cause as Error).message })
		}
	}

	return { state, tags, saving, message, save, updateTags }
}
