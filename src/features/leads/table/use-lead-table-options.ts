'use client'

import * as React from 'react'
import { fetchOriginOptions, fetchStageOptions, fetchTagOptions } from '@/features/leads/table/lead-table-api'
import type { LeadOriginOption } from '@/features/leads/table/lead-origin-options.service'
import type { LeadStageOption } from '@/features/leads/table/lead-stage-options.service'
import type { LeadTagChip } from '@/features/leads/table/lead-table.types'

/** Filter options (stages, origins, and tags when CRM fields are on). Failures leave the list empty. */
export function useLeadTableOptions(tagsEnabled: boolean) {
	const [stages, setStages] = React.useState<LeadStageOption[]>([])
	const [origins, setOrigins] = React.useState<LeadOriginOption[]>([])
	const [tags, setTags] = React.useState<LeadTagChip[]>([])

	React.useEffect(() => {
		let cancelled = false
		fetchStageOptions()
			.then((data) => !cancelled && setStages(data))
			.catch(() => undefined)
		fetchOriginOptions()
			.then((data) => !cancelled && setOrigins(data))
			.catch(() => undefined)
		if (tagsEnabled) {
			fetchTagOptions()
				.then((data) => !cancelled && setTags(data))
				.catch(() => undefined)
		}
		return () => {
			cancelled = true
		}
	}, [tagsEnabled])

	return { stages, origins, tags }
}
