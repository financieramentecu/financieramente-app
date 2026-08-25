'use client'

import { Download } from 'lucide-react'
import { Button } from '@/features/shared/ui/button'
import { Card, CardContent } from '@/features/shared/ui/card'
import { Separator } from '@/features/shared/ui/separator'
import { MonthRangePicker } from '@/features/production-dashboard/components/filters/MonthRangePicker'
import { MultiSelectFilter } from '@/features/production-dashboard/components/filters/MultiSelectFilter'
import { SingleSelectFilter } from '@/features/production-dashboard/components/filters/SingleSelectFilter'
import { useHierarchySelection } from '@/features/production-dashboard/components/HierarchySelectionContext'
import {
	PRODUCCION_REAL_FILTER_ACTION,
	useProduccionRealFilter,
} from './produccion-real-filter-context'
import { useProduccionRealCatalogs } from '../hooks/use-produccion-real-catalogs'
import { isoDayToPickerDate, pickerDateToIsoDay } from '../lib/filter-date'
import { PRODUCCION_REAL_UI } from '../lib/ui-copy'
import {
	CONTRIBUTION_TYPE,
	CURRENCY_MODE,
	type ProduccionRealContributionType,
} from '../types/produccion-real.types'

const CONTRIBUTION_ITEMS = [
	{ id: 1, label: PRODUCCION_REAL_UI.CONTRIBUTION_REGULAR, type: CONTRIBUTION_TYPE.REGULAR },
	{ id: 2, label: PRODUCCION_REAL_UI.CONTRIBUTION_UNICO, type: CONTRIBUTION_TYPE.UNICO },
] as const

const CURRENCY_OPTIONS = [
	{ value: CURRENCY_MODE.ALL_TRM, label: PRODUCCION_REAL_UI.CURRENCY_ALL_TRM },
	{ value: CURRENCY_MODE.FOREIGN, label: PRODUCCION_REAL_UI.CURRENCY_FOREIGN },
	{ value: CURRENCY_MODE.COP, label: PRODUCCION_REAL_UI.CURRENCY_COP },
]

function contributionTypesToIds(
	types: readonly ProduccionRealContributionType[]
): number[] {
	return CONTRIBUTION_ITEMS.filter((item) => types.includes(item.type)).map(
		(item) => item.id
	)
}

function idsToContributionTypes(
	ids: number[]
): ProduccionRealContributionType[] {
	return CONTRIBUTION_ITEMS.filter((item) => ids.includes(item.id)).map(
		(item) => item.type
	)
}

interface ProduccionRealFilterBarProps {
	readonly onExportExcel: () => void
	readonly isExporting: boolean
	/** Company-wide read-only role (CONSULTOR) never sees the export action. Defaults to true. */
	readonly canExport?: boolean
}

/**
 * Filter bar: draft edits, Aplicar commits, Limpiar restores defaults.
 * Descargar Excel uses applied filters via the parent-owned export hook.
 */
export function ProduccionRealFilterBar({
	onExportExcel,
	isExporting,
	canExport = true,
}: ProduccionRealFilterBarProps) {
	const { draft, dispatch, isApplyEnabled, dateRangeError } =
		useProduccionRealFilter()
	const { dispatch: hierarchyDispatch } = useHierarchySelection()
	const catalogState = useProduccionRealCatalogs()

	const companies =
		catalogState.status === 'success' ? catalogState.data.companies : []
	const companyItems = companies.map((c) => ({ id: c.id, label: c.name }))

	const handleClear = () => {
		dispatch({ type: PRODUCCION_REAL_FILTER_ACTION.CLEAR })
		hierarchyDispatch({ type: 'SELECT_ALL' })
	}

	return (
		<Card className="border border-border shadow-sm bg-card">
			<CardContent className="p-3 space-y-2">
				<h3 className="text-xs font-semibold text-foreground leading-none">
					{PRODUCCION_REAL_UI.FILTERS_TITLE}
				</h3>

				<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
					<div className="col-span-2">
						<MonthRangePicker
							value={{
								start: isoDayToPickerDate(draft.dateFrom),
								end: isoDayToPickerDate(draft.dateTo),
							}}
							onChange={(range) => {
								dispatch({
									type: PRODUCCION_REAL_FILTER_ACTION.SET_DATE_FROM,
									dateFrom: pickerDateToIsoDay(range.start),
								})
								dispatch({
									type: PRODUCCION_REAL_FILTER_ACTION.SET_DATE_TO,
									dateTo: pickerDateToIsoDay(range.end),
								})
							}}
							error={dateRangeError}
						/>
					</div>

					<MultiSelectFilter
						items={[...CONTRIBUTION_ITEMS]}
						value={contributionTypesToIds(draft.contributionTypes)}
						onChange={(ids) => {
							dispatch({
								type: PRODUCCION_REAL_FILTER_ACTION.SET_CONTRIBUTION_TYPES,
								contributionTypes: idsToContributionTypes(ids),
							})
						}}
						placeholder={PRODUCCION_REAL_UI.CONTRIBUTION_TYPE}
						todasLabel={PRODUCCION_REAL_UI.TODAS}
					/>

					<MultiSelectFilter
						items={companyItems}
						value={draft.companyIds}
						onChange={(ids) => {
							dispatch({
								type: PRODUCCION_REAL_FILTER_ACTION.SET_COMPANY_IDS,
								companyIds: ids,
							})
						}}
						placeholder={PRODUCCION_REAL_UI.COMPANY}
						todasLabel={PRODUCCION_REAL_UI.TODAS}
						searchable
					/>

					<SingleSelectFilter
						options={CURRENCY_OPTIONS}
						value={draft.currencyMode}
						onChange={(v) => {
							dispatch({
								type: PRODUCCION_REAL_FILTER_ACTION.SET_CURRENCY_MODE,
								currencyMode:
									v === CURRENCY_MODE.FOREIGN
										? CURRENCY_MODE.FOREIGN
										: v === CURRENCY_MODE.COP
											? CURRENCY_MODE.COP
											: CURRENCY_MODE.ALL_TRM,
							})
						}}
						placeholder={PRODUCCION_REAL_UI.CURRENCY}
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
						{PRODUCCION_REAL_UI.CLEAR}
					</Button>
					<Button
						type="button"
						size="sm"
						disabled={!isApplyEnabled}
						className="h-7 px-4 text-xs bg-green-600 hover:bg-green-700 active:bg-green-800 text-white dark:bg-green-600 dark:hover:bg-green-700 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
						onClick={() =>
							dispatch({ type: PRODUCCION_REAL_FILTER_ACTION.APPLY })
						}
					>
						{PRODUCCION_REAL_UI.APPLY}
					</Button>
					{canExport && (
						<Button
							type="button"
							size="sm"
							disabled={isExporting}
							className="h-7 px-3 text-xs bg-emerald-700 hover:bg-emerald-800 text-white"
							onClick={onExportExcel}
						>
							<Download className="size-3.5" />
							{PRODUCCION_REAL_UI.DOWNLOAD_EXCEL}
						</Button>
					)}
				</div>
			</CardContent>
		</Card>
	)
}
