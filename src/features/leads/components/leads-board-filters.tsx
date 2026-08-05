'use client'

import * as React from 'react'
import type { DateRange } from 'react-day-picker'
import { MultiSelect } from '@/features/shared/ui/multi-select'
import { DateRangePicker } from '@/features/shared/ui/date-range-picker'
import { LEAD_OUTCOME_STATUS_LABELS } from '@/features/leads/lib/lead-outcome-status'
import { LEAD_OUTCOME_STATUS_VALUES } from '@/features/leads/types/lead.types'
import type { LeadBoardFilters } from '@/features/leads/lib/lead-board-filters'

interface LeadsBoardFiltersProps {
	value: LeadBoardFilters
	onChange: (value: LeadBoardFilters) => void
}

const OUTCOME_STATUS_OPTIONS = LEAD_OUTCOME_STATUS_VALUES.map((status) => ({
	value: status,
	label: LEAD_OUTCOME_STATUS_LABELS[status],
}))

/**
 * Scoped calendar theming for this feature only (inline CSS custom-property
 * overrides, cascading via normal CSS inheritance) — never touches the
 * shared `Calendar` default. Range start/end (`bg-primary`) → dark green.
 * Days in between (`bg-accent`, `range_middle`) → light green.
 */
const DATE_RANGE_CALENDAR_STYLE = {
	'--primary': '142 76% 26%',
	'--primary-foreground': '0 0% 100%',
	'--accent': '142 60% 70%',
	'--accent-foreground': '142 80% 15%',
} as React.CSSProperties

/**
 * Presentational filter bar for the Leads Kanban board (D18): outcome-status
 * chips (`MultiSelect`, additive OR) + a `createdAt` date range
 * (`DateRangePicker`). Initial state comes from `getDefaultLeadBoardFilters()`
 * upstream — this component only reflects/mutates `value`.
 */
export function LeadsBoardFilters({ value, onChange }: LeadsBoardFiltersProps) {
	const dateRangeValue: DateRange | undefined = {
		from: value.createdAtRange.gte,
		to: value.createdAtRange.lte,
	}

	return (
		<div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-3">
			<div className="flex w-60 flex-col gap-1.5">
				<span className="text-xs font-medium text-slate-600 dark:text-slate-300">
					Estado del lead
				</span>
				<MultiSelect
					options={OUTCOME_STATUS_OPTIONS}
					value={value.outcomeStatuses}
					onChange={(outcomeStatuses) =>
						onChange({
							...value,
							outcomeStatuses: outcomeStatuses as LeadBoardFilters['outcomeStatuses'],
						})
					}
					placeholder="Estado del lead"
				/>
			</div>
			<div className="flex w-72 flex-col gap-1.5">
				<span className="text-xs font-medium text-slate-600 dark:text-slate-300">
					Fecha de creación
				</span>
				<DateRangePicker
					value={dateRangeValue}
					onChange={(range) => {
						if (!range?.from || !range?.to) return
						onChange({
							...value,
							createdAtRange: { gte: range.from, lte: range.to },
						})
					}}
					placeholder="Fecha de creación"
					calendarStyle={DATE_RANGE_CALENDAR_STYLE}
				/>
			</div>
		</div>
	)
}
