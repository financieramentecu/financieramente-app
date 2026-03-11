'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/shared/ui/tabs'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/features/shared/ui/table'
import { Button } from '@/features/shared/ui/button'
import { loadFileApi } from '../lib/load-file-api'
import type {
	FileImportRecordDetail,
	FileImportRecordStatusFilter,
} from '../types/load-file.types'
import { TableRowsLoadingSkeleton } from '@/features/shared/ui/loading-skeletons'
import { ChevronLeft, ChevronRight, CircleCheck, CircleX, CircleOff, Clock } from 'lucide-react'

const PAGE_SIZE = 20

const STATUS_FOR_TAB: Record<string, FileImportRecordStatusFilter> = {
	sincronizados: 'SYNCHRONIZED',
	noSincronizados: 'NO_SYNC',
	rezagados: 'REZAGADOS',
}

export interface RecordsByStatusCounts {
	sincronizados: number
	errores: number
	noSincronizados: number
	rezagados: number
}

interface RecordsByStatusViewProps {
	fileImportId: number
	/** If provided, cards use these counts; otherwise fetched from API */
	counts?: RecordsByStatusCounts | null
	/** Optional compact mode (e.g. inside modal) */
	compact?: boolean
}

function formatDecimal(value: number | null): string {
	if (value == null) return '-'
	return new Intl.NumberFormat('es-CO', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	}).format(value)
}

function formatDate(value: Date | null): string {
	if (!value) return '-'
	return new Date(value).toLocaleDateString('es-ES', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	})
}

export function RecordsByStatusView({
	fileImportId,
	counts: countsProp,
	compact = false,
}: RecordsByStatusViewProps) {
	const [counts, setCounts] = useState<RecordsByStatusCounts | null>(
		countsProp ?? null
	)
	const [activeTab, setActiveTab] = useState<string>('sincronizados')
	const [records, setRecords] = useState<FileImportRecordDetail[]>([])
	const [errors, setErrors] = useState<
		{ rowNumber: number; contract: string | null; reason: string }[]
	>([])
	const [pagination, setPagination] = useState({
		page: 1,
		pageSize: PAGE_SIZE,
		totalItems: 0,
		totalPages: 0,
	})
	const [loadingCounts, setLoadingCounts] = useState(!countsProp)
	const [loadingRecords, setLoadingRecords] = useState(false)
	const [loadingErrors, setLoadingErrors] = useState(false)

	// Fetch counts from API when not provided
	useEffect(() => {
		if (countsProp != null) {
			setCounts(countsProp)
			setLoadingCounts(false)
			return
		}
		let cancelled = false
		loadFileApi.getImportProgress(fileImportId).then((res) => {
			if (cancelled || !res.data) return
			setCounts({
				sincronizados: res.data.sincronizadoRecord ?? 0,
				errores: res.data.errorRecord ?? 0,
				noSincronizados: res.data.noSincronizadoRecord ?? 0,
				rezagados: res.data.rezagadoRecord ?? 0,
			})
			setLoadingCounts(false)
		})
		return () => {
			cancelled = true
		}
	}, [fileImportId, countsProp])

	// Fetch records when tab changes (for Sincronizados, No sincronizados, Rezagados)
	useEffect(() => {
		if (activeTab === 'errores') {
			setLoadingErrors(true)
			loadFileApi.getImportErrors(fileImportId).then((res) => {
				setErrors(res.data ?? [])
				setLoadingErrors(false)
			})
			return
		}
		const status = STATUS_FOR_TAB[activeTab]
		if (!status) return
		setLoadingRecords(true)
		loadFileApi
			.getImportRecords(fileImportId, {
				page: 1,
				pageSize: PAGE_SIZE,
				status,
			})
			.then((res) => {
				if (res.data) {
					setRecords(res.data.items)
					setPagination(res.data.pagination)
				} else {
					setRecords([])
				}
				setLoadingRecords(false)
			})
	}, [fileImportId, activeTab])

	const loadPage = (page: number) => {
		if (activeTab === 'errores') return
		const status = STATUS_FOR_TAB[activeTab]
		if (!status) return
		setLoadingRecords(true)
		loadFileApi
			.getImportRecords(fileImportId, {
				page,
				pageSize: PAGE_SIZE,
				status,
			})
			.then((res) => {
				if (res.data) {
					setRecords(res.data.items)
					setPagination(res.data.pagination)
				}
				setLoadingRecords(false)
			})
	}

	return (
		<div className={`flex flex-col items-stretch ${compact ? 'space-y-3' : 'space-y-4'}`}>
			{/* Summary cards */}
			<div className={`grid grid-cols-2 lg:grid-cols-4 ${compact ? 'gap-2' : 'gap-3'}`}>
				{loadingCounts ? (
					<div className="col-span-2 lg:col-span-4 h-20 rounded-lg bg-muted animate-pulse" />
				) : (
					<>
						{/* Sincronizados */}
						<div className="rounded-xl bg-emerald-500 p-5 shadow-lg shadow-emerald-500/20 transition-transform hover:scale-[1.02]">
							<div className="flex items-center justify-between mb-3">
								<div className="rounded-lg bg-white/20 p-2">
									<CircleCheck className="h-6 w-6 text-white" />
								</div>
								<span className={`font-extrabold text-white ${compact ? 'text-2xl' : 'text-4xl'}`}>
									{counts?.sincronizados ?? 0}
								</span>
							</div>
							<p className={`font-medium text-white/90 ${compact ? 'text-xs' : 'text-sm'}`}>
								Sincronizados
							</p>
						</div>

						{/* Errores */}
						<div className="rounded-xl bg-red-500 p-5 shadow-lg shadow-red-500/20 transition-transform hover:scale-[1.02]">
							<div className="flex items-center justify-between mb-3">
								<div className="rounded-lg bg-white/20 p-2">
									<CircleX className="h-6 w-6 text-white" />
								</div>
								<span className={`font-extrabold text-white ${compact ? 'text-2xl' : 'text-4xl'}`}>
									{counts?.errores ?? 0}
								</span>
							</div>
							<p className={`font-medium text-white/90 ${compact ? 'text-xs' : 'text-sm'}`}>
								Errores
							</p>
						</div>

						{/* No sincronizados */}
						<div className="rounded-xl bg-blue-500 p-5 shadow-lg shadow-blue-500/20 transition-transform hover:scale-[1.02]">
							<div className="flex items-center justify-between mb-3">
								<div className="rounded-lg bg-white/20 p-2">
									<CircleOff className="h-6 w-6 text-white" />
								</div>
								<span className={`font-extrabold text-white ${compact ? 'text-2xl' : 'text-4xl'}`}>
									{counts?.noSincronizados ?? 0}
								</span>
							</div>
							<p className={`font-medium text-white/90 ${compact ? 'text-xs' : 'text-sm'}`}>
								No sincronizados
							</p>
						</div>

						{/* Rezagados */}
						<div className="rounded-xl bg-amber-500 p-5 shadow-lg shadow-amber-500/20 transition-transform hover:scale-[1.02]">
							<div className="flex items-center justify-between mb-3">
								<div className="rounded-lg bg-white/20 p-2">
									<Clock className="h-6 w-6 text-white" />
								</div>
								<span className={`font-extrabold text-white ${compact ? 'text-2xl' : 'text-4xl'}`}>
									{counts?.rezagados ?? 0}
								</span>
							</div>
							<p className={`font-medium text-white/90 ${compact ? 'text-xs' : 'text-sm'}`}>
								Rezagados
							</p>
						</div>
					</>
				)}
			</div>

			<Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
				<TabsList className={`w-full flex flex-wrap shrink-0 ${compact ? 'gap-1 mt-1' : 'gap-1'}`}>
					<TabsTrigger value="sincronizados">Sincronizados</TabsTrigger>
					<TabsTrigger value="errores">Errores</TabsTrigger>
					<TabsTrigger value="noSincronizados">No sincronizados</TabsTrigger>
					<TabsTrigger value="rezagados">Rezagados</TabsTrigger>
				</TabsList>

				<TabsContent value="sincronizados" className={`mt-3 flex-1 min-h-0 data-[state=active]:flex data-[state=active]:flex-col ${compact ? 'data-[state=active]:overflow-auto' : ''}`}>
					{loadingRecords ? (
						<TableRowsLoadingSkeleton rows={5} />
					) : records.length === 0 ? (
						<p className={`text-sm text-muted-foreground text-center ${compact ? 'py-4' : 'py-6'}`}>
							No hay registros sincronizados.
						</p>
					) : (
						<>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Contrato</TableHead>
										<TableHead>Base</TableHead>
										<TableHead>Comisión</TableHead>
										<TableHead>Clawback</TableHead>
										<TableHead>% Desc.</TableHead>
										<TableHead>% Clawback</TableHead>
										<TableHead>Desde</TableHead>
										<TableHead>Hasta</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{records.map((row) => (
										<TableRow key={row.idSettlementCommission}>
											<TableCell>{row.contract ?? '-'}</TableCell>
											<TableCell>{formatDecimal(row.baseCommission)}</TableCell>
											<TableCell>{formatDecimal(row.commissionValue)}</TableCell>
											<TableCell>{row.isClawback ? 'Sí' : 'No'}</TableCell>
											<TableCell>
												{formatDecimal(row.discountPercentage)}
											</TableCell>
											<TableCell>
												{formatDecimal(row.clawbackPercentage)}
											</TableCell>
											<TableCell>{formatDate(row.startDate)}</TableCell>
											<TableCell>{formatDate(row.endDate)}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
							{pagination.totalPages > 1 && (
								<div className="flex items-center justify-between mt-3">
									<p className="text-sm text-muted-foreground">
										{pagination.totalItems} registro(s)
									</p>
									<div className="flex gap-2">
										<Button
											variant="outline"
											size="sm"
											disabled={pagination.page <= 1}
											onClick={() => loadPage(pagination.page - 1)}
										>
											<ChevronLeft className="h-4 w-4" />
										</Button>
										<span className="text-sm py-2">
											{pagination.page} / {pagination.totalPages}
										</span>
										<Button
											variant="outline"
											size="sm"
											disabled={pagination.page >= pagination.totalPages}
											onClick={() => loadPage(pagination.page + 1)}
										>
											<ChevronRight className="h-4 w-4" />
										</Button>
									</div>
								</div>
							)}
						</>
					)}
				</TabsContent>

				<TabsContent value="errores" className={`mt-3 flex-1 min-h-0 data-[state=active]:flex data-[state=active]:flex-col ${compact ? 'data-[state=active]:overflow-auto' : ''}`}>
					{loadingErrors ? (
						<TableRowsLoadingSkeleton rows={5} />
					) : errors.length === 0 ? (
						<p className={`text-sm text-muted-foreground text-center ${compact ? 'py-4' : 'py-6'}`}>
							No hay errores.
						</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Fila</TableHead>
									<TableHead>Contrato</TableHead>
									<TableHead>Causa</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{errors.map((err, idx) => (
									<TableRow key={`${err.rowNumber}-${idx}`}>
										<TableCell>{err.rowNumber}</TableCell>
										<TableCell>{err.contract ?? '-'}</TableCell>
										<TableCell className="text-destructive">
											{err.reason}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</TabsContent>

				<TabsContent value="noSincronizados" className={`mt-3 flex-1 min-h-0 data-[state=active]:flex data-[state=active]:flex-col ${compact ? 'data-[state=active]:overflow-auto' : ''}`}>
					{loadingRecords ? (
						<TableRowsLoadingSkeleton rows={5} />
					) : records.length === 0 ? (
						<p className={`text-sm text-muted-foreground text-center ${compact ? 'py-4' : 'py-6'}`}>
							No hay registros no sincronizados.
						</p>
					) : (
						<>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Contrato</TableHead>
										<TableHead>Base</TableHead>
										<TableHead>Comisión</TableHead>
										<TableHead>LAG</TableHead>
										<TableHead>Clawback</TableHead>
										<TableHead>% Desc.</TableHead>
										<TableHead>Detalle</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{records.map((row) => (
										<TableRow key={row.idSettlementCommission}>
											<TableCell>{row.contract ?? '-'}</TableCell>
											<TableCell>{formatDecimal(row.baseCommission)}</TableCell>
											<TableCell>{formatDecimal(row.commissionValue)}</TableCell>
											<TableCell>{row.isLag ? 'Sí' : 'No'}</TableCell>
											<TableCell>{row.isClawback ? 'Sí' : 'No'}</TableCell>
											<TableCell>
												{formatDecimal(row.discountPercentage)}
											</TableCell>
											<TableCell className="text-muted-foreground">
												{row.detail ?? '-'}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
							{pagination.totalPages > 1 && (
								<div className="flex items-center justify-between mt-3">
									<p className="text-sm text-muted-foreground">
										{pagination.totalItems} registro(s)
									</p>
									<div className="flex gap-2">
										<Button
											variant="outline"
											size="sm"
											disabled={pagination.page <= 1}
											onClick={() => loadPage(pagination.page - 1)}
										>
											<ChevronLeft className="h-4 w-4" />
										</Button>
										<span className="text-sm py-2">
											{pagination.page} / {pagination.totalPages}
										</span>
										<Button
											variant="outline"
											size="sm"
											disabled={pagination.page >= pagination.totalPages}
											onClick={() => loadPage(pagination.page + 1)}
										>
											<ChevronRight className="h-4 w-4" />
										</Button>
									</div>
								</div>
							)}
						</>
					)}
				</TabsContent>

				<TabsContent value="rezagados" className={`mt-3 flex-1 min-h-0 data-[state=active]:flex data-[state=active]:flex-col ${compact ? 'data-[state=active]:overflow-auto' : ''}`}>
					{loadingRecords ? (
						<TableRowsLoadingSkeleton rows={5} />
					) : records.length === 0 ? (
						<p className={`text-sm text-muted-foreground text-center ${compact ? 'py-4' : 'py-6'}`}>
							No hay registros rezagados.
						</p>
					) : (
						<>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Contrato</TableHead>
										<TableHead>Base</TableHead>
										<TableHead>Comisión</TableHead>
										<TableHead>LAG</TableHead>
										<TableHead>Clawback</TableHead>
										<TableHead>% Desc.</TableHead>
										<TableHead>% Clawback</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{records.map((row) => (
										<TableRow key={row.idSettlementCommission}>
											<TableCell>{row.contract ?? '-'}</TableCell>
											<TableCell>{formatDecimal(row.baseCommission)}</TableCell>
											<TableCell>{formatDecimal(row.commissionValue)}</TableCell>
											<TableCell>{row.isLag ? 'Sí' : 'No'}</TableCell>
											<TableCell>{row.isClawback ? 'Sí' : 'No'}</TableCell>
											<TableCell>
												{formatDecimal(row.discountPercentage)}
											</TableCell>
											<TableCell>
												{formatDecimal(row.clawbackPercentage)}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
							{pagination.totalPages > 1 && (
								<div className="flex items-center justify-between mt-3">
									<p className="text-sm text-muted-foreground">
										{pagination.totalItems} registro(s)
									</p>
									<div className="flex gap-2">
										<Button
											variant="outline"
											size="sm"
											disabled={pagination.page <= 1}
											onClick={() => loadPage(pagination.page - 1)}
										>
											<ChevronLeft className="h-4 w-4" />
										</Button>
										<span className="text-sm py-2">
											{pagination.page} / {pagination.totalPages}
										</span>
										<Button
											variant="outline"
											size="sm"
											disabled={pagination.page >= pagination.totalPages}
											onClick={() => loadPage(pagination.page + 1)}
										>
											<ChevronRight className="h-4 w-4" />
										</Button>
									</div>
								</div>
							)}
						</>
					)}
				</TabsContent>
			</Tabs>
		</div >
	)
}
