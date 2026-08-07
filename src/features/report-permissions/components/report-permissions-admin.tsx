'use client'

import {
	REPORT_PERMISSIONS_UI,
} from '@/features/report-permissions/lib/report-permissions-helpers'
import { useReportPermissions } from '@/features/report-permissions/hooks/use-report-permissions'
import { Checkbox } from '@/features/shared/ui/checkbox'
import { Button } from '@/features/shared/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/features/shared/ui/card'
import { Label } from '@/features/shared/ui/label'

export function ReportPermissionsAdmin() {
	const {
		catalogState,
		selectedCode,
		selectedCategoryIds,
		isSaving,
		todasChecked,
		selectReport,
		handleToggleTodas,
		handleToggleCategory,
		handleSave,
	} = useReportPermissions()

	if (catalogState.status === 'loading' || catalogState.status === 'idle') {
		return (
			<p className="text-muted-foreground text-sm">Cargando permisos…</p>
		)
	}

	if (catalogState.status === 'error') {
		return (
			<p className="text-destructive text-sm">{catalogState.error}</p>
		)
	}

	const { reports, matrix } = catalogState.data
	const categories = matrix?.categories ?? []

	return (
		<div className="grid gap-6 lg:grid-cols-[240px_1fr]">
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Reportes</CardTitle>
					<CardDescription>Selecciona un reporte del catálogo</CardDescription>
				</CardHeader>
				<CardContent className="space-y-1">
					{reports.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							No hay reportes en el catálogo
						</p>
					) : (
						reports.map((report) => (
							<button
								key={report.code}
								type="button"
								onClick={() => void selectReport(report.code)}
								className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
									selectedCode === report.code
										? 'bg-primary text-primary-foreground'
										: 'hover:bg-muted'
								}`}
							>
								{report.name}
							</button>
						))
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="flex flex-row items-start justify-between gap-4">
					<div>
						<CardTitle className="text-base">
							{matrix?.report.name ?? 'Categorías'}
						</CardTitle>
						<CardDescription>
							Categorías habilitadas para ver este reporte
						</CardDescription>
					</div>
					<Button
						onClick={() => void handleSave()}
						disabled={isSaving || !selectedCode}
					>
						{isSaving ? 'Guardando…' : REPORT_PERMISSIONS_UI.SAVE}
					</Button>
				</CardHeader>
				<CardContent className="space-y-4">
					{categories.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							No hay categorías activas
						</p>
					) : (
						<>
							<div className="flex items-center gap-2 border-b pb-3">
								<Checkbox
									id="todas"
									checked={todasChecked}
									onCheckedChange={(checked) =>
										handleToggleTodas(checked === true)
									}
								/>
								<Label htmlFor="todas" className="font-semibold">
									{REPORT_PERMISSIONS_UI.TODAS}
								</Label>
							</div>

							{selectedCategoryIds.length === 0 && (
								<p className="text-muted-foreground text-sm">
									{REPORT_PERMISSIONS_UI.EMPTY_STATE}
								</p>
							)}

							<ul className="space-y-3">
								{categories.map((category) => {
									const checked = selectedCategoryIds.includes(
										category.idCategory
									)
									const inputId = `category-${category.idCategory}`
									return (
										<li key={category.idCategory} className="flex items-center gap-2">
											<Checkbox
												id={inputId}
												checked={checked}
												onCheckedChange={() =>
													handleToggleCategory(category.idCategory)
												}
											/>
											<Label htmlFor={inputId}>{category.name}</Label>
										</li>
									)
								})}
							</ul>
						</>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
