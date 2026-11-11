'use client'

import { Fragment, useEffect, useState, type FormEvent } from 'react'
import { ArrowDown, ArrowUp, ChevronDown, Download, Search } from 'lucide-react'
import { Badge } from '@/features/shared/ui/badge'
import { Button } from '@/features/shared/ui/button'
import { Input } from '@/features/shared/ui/input'
import { MultiSelect } from '@/features/shared/ui/multi-select'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/features/shared/ui/table'
import { formatDateBogota } from '@/features/shared/lib/format-date'
import {
	LEAD_OUTCOME_STATUS_BADGE_VARIANTS,
	LEAD_OUTCOME_STATUS_LABELS,
} from '@/features/leads/lib/lead-outcome-status'
import {
	LEAD_OUTCOME_STATUS_VALUES,
	type LeadOutcomeStatus,
} from '@/features/leads/types/lead.types'
import { InactivityBadge } from '@/features/leads/components/inactivity-badge'
import {
	toSavedLeadTableQuery,
	type LeadTableSort,
} from '@/features/leads/table/lead-table-query.schema'
import { buildLeadExportUrl } from '@/features/leads/table/lead-table-api'
import { formatLeadAmount } from '@/features/leads/table/format-lead-amount'
import { useLeadTable } from '@/features/leads/table/use-lead-table'
import { useLeadTableOptions } from '@/features/leads/table/use-lead-table-options'
import type {
	LeadTablePage,
	LeadTableRow,
} from '@/features/leads/table/lead-table.types'
import { LeadTableDetail } from '@/features/leads/table/lead-table-detail'
import { SavedViewsBar } from '@/features/leads/views/saved-views-bar'
import { CrmSettingsDialog } from '@/features/leads/custom-fields/crm-settings-dialog'
import { CRM_HIERARCHY_EMPTY_MESSAGE, useCrmHierarchyFilter } from '@/features/leads/components/crm-hierarchy-shell'

const STATUS_OPTIONS = LEAD_OUTCOME_STATUS_VALUES.map((value) => ({
	value,
	label: LEAD_OUTCOME_STATUS_LABELS[value],
}))

function SortableHead({
	label,
	sort,
	current,
	dir,
	onSort,
	className,
}: {
	label: string
	sort: LeadTableSort
	current: LeadTableSort
	dir: 'asc' | 'desc'
	onSort: (sort: LeadTableSort) => void
	className?: string
}) {
	const active = current === sort
	const Icon = dir === 'asc' ? ArrowUp : ArrowDown
	return (
		<TableHead
			className={className}
			aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
		>
			<button
				type="button"
				className="inline-flex items-center gap-1 hover:text-foreground"
				onClick={() => onSort(sort)}
			>
				{label}
				{active && <Icon className="size-3.5" aria-hidden />}
			</button>
		</TableHead>
	)
}

function fullName(row: LeadTableRow): string {
	return [row.name, row.lastName].filter(Boolean).join(' ') || 'Sin nombre'
}

function Pager({
	page,
	onPage,
}: {
	page: LeadTablePage
	onPage: (page: number) => void
}) {
	const pages = Math.max(1, Math.ceil(page.total / page.pageSize))
	const from = page.total === 0 ? 0 : (page.page - 1) * page.pageSize + 1
	const to = Math.min(page.page * page.pageSize, page.total)
	return (
		<div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
			<span>
				{from}–{to} de {page.total.toLocaleString('es-CO')} leads
			</span>
			<div className="flex items-center gap-2">
				<Button
					type="button"
					size="sm"
					variant="outline"
					disabled={page.page <= 1}
					onClick={() => onPage(page.page - 1)}
				>
					Anterior
				</Button>
				<span>
					Página {page.page} de {pages}
				</span>
				<Button
					type="button"
					size="sm"
					variant="outline"
					disabled={page.page >= pages}
					onClick={() => onPage(page.page + 1)}
				>
					Siguiente
				</Button>
			</div>
		</div>
	)
}

/** CRM "Leads" tab: Twenty-style table with search, filters, sort, paging, totals and CSV export. */
export function LeadsTable({
	onOpenLead,
	fieldsEnabled,
	canConfigure = false,
}: {
	onOpenLead: (idLead: number) => void
	fieldsEnabled: boolean
	/** CRM managers see the tag / custom field settings. */
	canConfigure?: boolean
}) {
	const { query, state, updateFilters, goToPage, toggleSort, replaceQuery } =
		useLeadTable()
	const hierarchy = useCrmHierarchyFilter()
	const ownerKey = hierarchy.ownerIds.join(',')
	const [search, setSearch] = useState(query.q ?? '')
	const [openIds, setOpenIds] = useState<number[]>([])
	const sortProps = { current: query.sort, dir: query.dir, onSort: toggleSort }

	useEffect(() => {
		if (!hierarchy.ready || hierarchy.noneSelected) return
		if (query.ownerIds.join(',') === ownerKey) return
		updateFilters({ ownerIds: hierarchy.ownerIds })
		// ownerKey is the identity of the hierarchy selection.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [hierarchy.ready, hierarchy.noneSelected, ownerKey])
	const { stages, tags } = useLeadTableOptions(fieldsEnabled)

	function toggleLead(idLead: number) {
		setOpenIds((current) =>
			current.includes(idLead) ? current.filter((id) => id !== idLead) : [...current, idLead]
		)
	}

	const columnCount = fieldsEnabled ? 8 : 6

	function submitSearch(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		updateFilters({ q: search.trim() || undefined })
	}

	if (hierarchy.noneSelected) {
		return <p className="text-sm text-muted-foreground">{CRM_HIERARCHY_EMPTY_MESSAGE}</p>
	}

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center gap-2">
				<form
					onSubmit={submitSearch}
					className="flex items-center gap-2"
					role="search"
				>
					<Input
						aria-label="Buscar leads"
						placeholder="Nombre, correo, teléfono o documento"
						value={search}
						maxLength={100}
						onChange={(event) => setSearch(event.target.value)}
						className="h-9 w-72"
					/>
					<Button type="submit" size="sm" variant="outline" aria-label="Buscar">
						<Search className="size-4" aria-hidden />
					</Button>
				</form>
				<MultiSelect
					className="w-44"
					placeholder="Estado"
					options={STATUS_OPTIONS}
					value={query.statuses}
					onChange={(values) =>
						updateFilters({ statuses: values as LeadOutcomeStatus[] })
					}
				/>
				<MultiSelect
					className="w-44"
					placeholder="Etapa"
					options={stages.map((stage) => ({
						value: String(stage.idLeadFunnelColumn),
						label: stage.name,
					}))}
					value={query.stageIds.map(String)}
					onChange={(values) => updateFilters({ stageIds: values.map(Number) })}
				/>
				{fieldsEnabled && (
					<MultiSelect
						className="w-44"
						placeholder="Etiquetas"
						options={tags.map((tag) => ({
							value: String(tag.idLeadTag),
							label: tag.name,
						}))}
						value={query.tagIds.map(String)}
						onChange={(values) => updateFilters({ tagIds: values.map(Number) })}
					/>
				)}
				<label className="flex items-center gap-2 text-sm">
					<input
						type="checkbox"
						checked={query.idle}
						onChange={(event) => updateFilters({ idle: event.target.checked })}
					/>
					Sin actividad
				</label>
				<div className="ml-auto flex items-center gap-2">
					{fieldsEnabled && canConfigure && <CrmSettingsDialog />}
					<Button asChild size="sm" variant="outline">
						<a href={buildLeadExportUrl(query)} download>
							<Download className="size-4" aria-hidden />
							Exportar CSV
						</a>
					</Button>
				</div>
			</div>

			<SavedViewsBar
				currentQuery={toSavedLeadTableQuery(query)}
				onApply={replaceQuery}
			/>

			{state.status === 'error' && (
				<p role="alert" className="text-sm text-destructive">
					{state.error}
				</p>
			)}
			{(state.status === 'loading' || state.status === 'idle') && (
				<p role="status" className="text-sm text-muted-foreground">
					Cargando leads…
				</p>
			)}
			{state.status === 'success' && (
				<>
					<div className="rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<SortableHead label="Lead" sort="name" {...sortProps} />
									<TableHead>Etapa</TableHead>
									<TableHead>Estado</TableHead>
									<TableHead>Responsable</TableHead>
									{fieldsEnabled && (
										<SortableHead
											label="Valor"
											sort="estimatedValue"
											className="text-right"
											{...sortProps}
										/>
									)}
									{fieldsEnabled && (
										<SortableHead
											label="Prob."
											sort="probability"
											className="text-right"
											{...sortProps}
										/>
									)}
									<SortableHead
										label="Última actividad"
										sort="lastActivityAt"
										{...sortProps}
									/>
									<SortableHead
										label="Creado"
										sort="createdAt"
										{...sortProps}
									/>
								</TableRow>
							</TableHeader>
							<TableBody>
								{state.data.items.length === 0 && (
									<TableRow>
										<TableCell
											colSpan={fieldsEnabled ? 8 : 6}
											className="py-8 text-center text-muted-foreground"
										>
											No hay leads con estos filtros.
										</TableCell>
									</TableRow>
								)}
								{state.data.items.map((row) => {
									const open = openIds.includes(row.idLead)
									const name = fullName(row)
									return (
										<Fragment key={row.idLead}>
											<TableRow className={open ? 'border-b-0' : undefined}>
												<TableCell>
													<button
														type="button"
														className="inline-flex items-center gap-1 text-left font-medium underline-offset-2 hover:underline"
														aria-expanded={open}
														onClick={() => toggleLead(row.idLead)}
													>
														<ChevronDown
															className={`size-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
															aria-hidden
														/>
														{name}
													</button>
													<p className="text-xs text-muted-foreground">
														{row.email ?? row.phone ?? ''}
													</p>
													{fieldsEnabled && row.tags.length > 0 && (
														<div className="mt-1 flex flex-wrap gap-1">
															{row.tags.map((tag) => (
																<Badge
																	key={tag.idLeadTag}
																	variant="outline"
																	style={{
																		borderColor: tag.color,
																		color: tag.color,
																	}}
																>
																	{tag.name}
																</Badge>
															))}
														</div>
													)}
													<Button
														type="button"
														size="sm"
														variant="ghost"
														className="mt-1 h-7 px-2"
														onClick={() => onOpenLead(row.idLead)}
													>
														Abrir ficha
													</Button>
												</TableCell>
												<TableCell>{row.stageName}</TableCell>
												<TableCell>
													<Badge
														variant={
															LEAD_OUTCOME_STATUS_BADGE_VARIANTS[row.outcomeStatus]
														}
													>
														{LEAD_OUTCOME_STATUS_LABELS[row.outcomeStatus]}
													</Badge>
												</TableCell>
												<TableCell>{row.ownerName ?? 'Sin asignar'}</TableCell>
												{fieldsEnabled && (
													<TableCell className="text-right">
														{formatLeadAmount(row.estimatedValue)}
													</TableCell>
												)}
												{fieldsEnabled && (
													<TableCell className="text-right">
														{row.probability === null ? '—' : `${row.probability}%`}
													</TableCell>
												)}
												<TableCell>
													<span className="flex flex-wrap items-center gap-1">
														{row.lastActivityAt
															? formatDateBogota(row.lastActivityAt)
															: 'Sin actividad'}
														<InactivityBadge days={row.inactiveDays} />
													</span>
												</TableCell>
												<TableCell>{formatDateBogota(row.createdAt)}</TableCell>
											</TableRow>
											{open ? (
												<TableRow>
													<TableCell
														colSpan={columnCount}
														className="bg-slate-50 dark:bg-slate-900/40"
													>
														<LeadTableDetail idLead={row.idLead} leadName={name} />
													</TableCell>
												</TableRow>
											) : null}
										</Fragment>
									)
								})}
							</TableBody>
						</Table>
					</div>
					{fieldsEnabled && (
						<p className="text-sm" aria-label="Totales del pipeline">
							{state.data.totals.estimatedValue === null ? (
								<span className="text-muted-foreground">
									Filtra la lista para ver los totales del pipeline.
								</span>
							) : (
								<>
									Valor estimado{' '}
									<strong>
										{formatLeadAmount(state.data.totals.estimatedValue)}
									</strong>
									{' · '}
									Valor ponderado{' '}
									<strong>
										{formatLeadAmount(state.data.totals.weightedValue)}
									</strong>
								</>
							)}
						</p>
					)}
					<Pager page={state.data} onPage={goToPage} />
				</>
			)}
		</div>
	)
}
