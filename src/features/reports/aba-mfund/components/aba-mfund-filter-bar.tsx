'use client'

import { Download } from 'lucide-react'
import { Button } from '@/features/shared/ui/button'
import { Card, CardContent } from '@/features/shared/ui/card'
import { Separator } from '@/features/shared/ui/separator'
import { MonthRangePicker } from '@/features/production-dashboard/components/filters/MonthRangePicker'
import { MultiSelectFilter } from '@/features/production-dashboard/components/filters/MultiSelectFilter'
import { useHierarchySelection } from '@/features/production-dashboard/components/HierarchySelectionContext'
import type { BusinessStatus } from '@/features/negocios/types/business-entity.types'
import {
	ABA_MFUND_FILTER_ACTION,
	useAbaMfundFilter,
} from './aba-mfund-filter-context'
import { isoDayToPickerDate, pickerDateToIsoDay } from '../lib/filter-date'
import { ABA_MFUND_STATUS_OPTIONS, ABA_MFUND_UI } from '../lib/ui-copy'

const STATUS_ITEMS = ABA_MFUND_STATUS_OPTIONS.map((option, index) => ({
	id: index + 1,
	label: option.label,
	status: option.value,
}))

function statusesToIds(statuses: readonly BusinessStatus[]): number[] {
	return STATUS_ITEMS.filter((item) => statuses.includes(item.status)).map(
		(item) => item.id
	)
}

function idsToStatuses(ids: number[]): BusinessStatus[] {
	return STATUS_ITEMS.filter((item) => ids.includes(item.id)).map(
		(item) => item.status
	)
}

interface AbaMfundFilterBarProps {
	readonly onExportExcel: () => void
	readonly isExporting: boolean
}

/**
 * Filter bar: draft edits, Aplicar commits, Limpiar restores defaults.
 * Descargar Excel uses applied filters via the parent-owned export hook.
 */
export function AbaMfundFilterBar({
	onExportExcel,
	isExporting,
}: AbaMfundFilterBarProps) {
	const { draft, dispatch, isApplyEnabled, dateRangeError } =
		useAbaMfundFilter()
	const { dispatch: hierarchyDispatch } = useHierarchySelection()

	const handleClear = () => {
		dispatch({ type: ABA_MFUND_FILTER_ACTION.CLEAR })
		hierarchyDispatch({ type: 'SELECT_ALL' })
	}

	return (
		<Card className="border border-border shadow-sm bg-card">
			<CardContent className="p-3 space-y-2">
				<h3 className="text-xs font-semibold text-foreground leading-none">
					{ABA_MFUND_UI.FILTERS_TITLE}
				</h3>

				<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
					<div className="col-span-2">
						<MonthRangePicker
							value={{
								start: isoDayToPickerDate(draft.dateFrom),
								end: isoDayToPickerDate(draft.dateTo),
							}}
							onChange={(range) => {
								dispatch({
									type: ABA_MFUND_FILTER_ACTION.SET_DATE_FROM,
									dateFrom: pickerDateToIsoDay(range.start),
								})
								dispatch({
									type: ABA_MFUND_FILTER_ACTION.SET_DATE_TO,
									dateTo: pickerDateToIsoDay(range.end),
								})
							}}
							error={dateRangeError}
						/>
					</div>

					<MultiSelectFilter
						items={STATUS_ITEMS}
						value={statusesToIds(draft.statuses)}
						onChange={(ids) => {
							dispatch({
								type: ABA_MFUND_FILTER_ACTION.SET_STATUSES,
								statuses: idsToStatuses(ids),
							})
						}}
						placeholder={ABA_MFUND_UI.STATUS}
						todasLabel={ABA_MFUND_UI.ALL}
					/>
				</div>

				<Separator />

				<div className="flex flex-wrap items-center justify-end gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="h-7 px-3 text-xs"
						onClick={handleClear}
					>
						{ABA_MFUND_UI.CLEAR}
					</Button>
					<Button
						type="button"
						size="sm"
						disabled={!isApplyEnabled}
						className="h-7 px-4 text-xs bg-green-600 hover:bg-green-700 active:bg-green-800 text-white dark:bg-green-600 dark:hover:bg-green-700 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
						onClick={() =>
							dispatch({ type: ABA_MFUND_FILTER_ACTION.APPLY })
						}
					>
						{ABA_MFUND_UI.APPLY}
					</Button>
					<Button
						type="button"
						size="sm"
						disabled={isExporting}
						className="h-7 px-3 text-xs bg-emerald-700 hover:bg-emerald-800 text-white"
						onClick={onExportExcel}
					>
						<Download className="size-3.5" />
						{ABA_MFUND_UI.DOWNLOAD_EXCEL}
					</Button>
				</div>
			</CardContent>
		</Card>
	)
}
