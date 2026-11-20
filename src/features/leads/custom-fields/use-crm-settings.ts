'use client'

import * as React from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import { fetchTagOptions } from '@/features/leads/table/lead-table-api'
import type { LeadTagChip } from '@/features/leads/table/lead-table.types'
import type { CustomFieldDefinition } from '@/features/leads/custom-fields/custom-field.types'
import {
	createCustomField,
	createTag,
	deleteCustomField,
	deleteTag,
	fetchCustomFields,
} from '@/features/leads/custom-fields/crm-fields-api'

export interface CrmSettingsData {
	tags: LeadTagChip[]
	fields: CustomFieldDefinition[]
}

/** Tag catalogue and custom field definitions, for CRM managers. */
export function useCrmSettings(enabled: boolean) {
	const [state, setState] = React.useState<AsyncState<CrmSettingsData>>({ status: 'idle', data: undefined, error: '' })
	const [actionError, setActionError] = React.useState<string | null>(null)

	async function load() {
		try {
			const [tags, fields] = await Promise.all([fetchTagOptions(), fetchCustomFields()])
			setState({ status: 'success', data: { tags, fields }, error: '' })
		} catch (cause) {
			setState({ status: 'error', data: undefined, error: (cause as Error).message })
		}
	}

	React.useEffect(() => {
		if (!enabled) return
		setState({ status: 'loading', data: undefined, error: '' })
		void load()
	}, [enabled])

	async function run(action: () => Promise<unknown>): Promise<boolean> {
		setActionError(null)
		try {
			await action()
			await load()
			return true
		} catch (cause) {
			setActionError((cause as Error).message)
			return false
		}
	}

	return {
		state,
		actionError,
		addTag: (name: string, color: string) => run(() => createTag({ name, color })),
		removeTag: (idLeadTag: number) => run(() => deleteTag(idLeadTag)),
		addField: (input: Parameters<typeof createCustomField>[0]) => run(() => createCustomField(input)),
		removeField: (idLeadCustomField: number) => run(() => deleteCustomField(idLeadCustomField)),
	}
}
