'use client'

import { Card, CardContent } from '@/features/shared/ui/card'
import { NO_PIPELINE, togglePipeline } from '../lib/pipeline-filter'
import { COMMERCIAL_DASHBOARD_UI as UI } from '../lib/ui-copy'
import type { CommercialPipelineOption } from '../types/commercial-dashboard.types'

interface CommercialPipelineFilterProps {
	readonly options: readonly CommercialPipelineOption[]
	/** null = every pipeline is active. */
	readonly selected: readonly string[] | null
	readonly onChange: (next: readonly string[] | null) => void
}

const CHIP_BASE =
	'rounded-full border px-3 py-1 text-xs font-medium transition-colors'
const CHIP_ON = 'border-primary bg-primary text-primary-foreground'
const CHIP_OFF =
	'border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground'

/**
 * Pipeline chips. Applies immediately (no Aplicar): it only narrows the cohort.
 */
export function CommercialPipelineFilter({
	options,
	selected,
	onChange,
}: CommercialPipelineFilterProps) {
	if (options.length === 0) return null
	const allNames = options.map((option) => option.name)
	const active = new Set(selected ?? allNames)

	return (
		<Card className="border border-border bg-card shadow-sm">
			<CardContent className="space-y-2 p-3">
				<h3 className="text-xs font-semibold leading-none text-foreground">
					{UI.PIPELINE_TITLE}
				</h3>
				<div className="flex flex-wrap gap-2">
					<button
						type="button"
						aria-pressed={selected === null}
						onClick={() => onChange(null)}
						className={`${CHIP_BASE} ${selected === null ? CHIP_ON : CHIP_OFF}`}
					>
						{UI.PIPELINE_ALL}
					</button>
					{options.map((option) => (
						<button
							key={option.name}
							type="button"
							aria-pressed={selected !== null && active.has(option.name)}
							onClick={() =>
								onChange(togglePipeline(selected, option.name, allNames))
							}
							className={`${CHIP_BASE} ${selected !== null && active.has(option.name) ? CHIP_ON : CHIP_OFF}`}
						>
							{option.name === NO_PIPELINE ? UI.PIPELINE_NONE : option.name}
							<span className="ml-1.5 tabular-nums opacity-70">
								{option.count}
							</span>
						</button>
					))}
				</div>
			</CardContent>
		</Card>
	)
}
