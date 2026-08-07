'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
	fetchReportPermissionsCatalog,
	saveReportPermissions,
} from '@/features/report-permissions/lib/report-permissions-api'
import {
	canSavePermissions,
	isTodasSelected,
	REPORT_PERMISSIONS_UI,
	toggleCategorySelection,
	toggleTodas,
} from '@/features/report-permissions/lib/report-permissions-helpers'
import type { ReportPermissionsCatalog } from '@/features/report-permissions/types/report-permissions.types'
import type { AsyncState } from '@/features/shared/types/async-state.types'

export function useReportPermissions(initialCode?: string) {
	const [catalogState, setCatalogState] = useState<
		AsyncState<ReportPermissionsCatalog>
	>({
		status: 'loading',
		data: undefined,
		error: '',
	})
	const [selectedCode, setSelectedCode] = useState<string | undefined>(
		initialCode
	)
	const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([])
	const [isSaving, setIsSaving] = useState(false)

	async function loadCatalog(code?: string) {
		setCatalogState({ status: 'loading', data: undefined, error: '' })
		try {
			const catalog = await fetchReportPermissionsCatalog(code)
			const resolvedCode = catalog.matrix?.report.code ?? catalog.reports[0]?.code
			setSelectedCode(resolvedCode)
			const enabledIds =
				catalog.matrix?.categories
					.filter((c) => c.enabled)
					.map((c) => c.idCategory) ?? []
			setSelectedCategoryIds(enabledIds)
			setCatalogState({ status: 'success', data: catalog, error: '' })
		} catch (err) {
			setCatalogState({
				status: 'error',
				data: undefined,
				error:
					err instanceof Error
						? err.message
						: 'Error al cargar permisos de reportes',
			})
		}
	}

	useEffect(() => {
		void loadCatalog(initialCode)
		// eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
	}, [])

	async function selectReport(code: string) {
		setSelectedCode(code)
		await loadCatalog(code)
	}

	function handleToggleTodas(checked: boolean) {
		const allIds =
			catalogState.status === 'success'
				? catalogState.data.matrix?.categories.map((c) => c.idCategory) ?? []
				: []
		setSelectedCategoryIds(toggleTodas(checked, allIds))
	}

	function handleToggleCategory(categoryId: number) {
		setSelectedCategoryIds((prev) => toggleCategorySelection(categoryId, prev))
	}

	async function handleSave(): Promise<boolean> {
		if (!selectedCode) return false

		if (!canSavePermissions(selectedCategoryIds)) {
			toast.warning(REPORT_PERMISSIONS_UI.SAVE_WARNING)
			return false
		}

		setIsSaving(true)
		try {
			const matrix = await saveReportPermissions(
				selectedCode,
				selectedCategoryIds
			)
			setSelectedCategoryIds(
				matrix.categories.filter((c) => c.enabled).map((c) => c.idCategory)
			)
			if (catalogState.status === 'success') {
				setCatalogState({
					status: 'success',
					data: {
						...catalogState.data,
						matrix,
					},
					error: '',
				})
			}
			toast.success(REPORT_PERMISSIONS_UI.SAVE_SUCCESS)
			return true
		} catch (err) {
			toast.error(
				err instanceof Error
					? err.message
					: 'Error al guardar permisos de reportes'
			)
			return false
		} finally {
			setIsSaving(false)
		}
	}

	const allCategoryIds =
		catalogState.status === 'success'
			? (catalogState.data.matrix?.categories.map((c) => c.idCategory) ?? [])
			: []

	const todasChecked = isTodasSelected(selectedCategoryIds, allCategoryIds)

	return {
		catalogState,
		selectedCode,
		selectedCategoryIds,
		isSaving,
		todasChecked,
		selectReport,
		handleToggleTodas,
		handleToggleCategory,
		handleSave,
		refresh: () => loadCatalog(selectedCode),
	}
}
