'use client'

import { Skeleton } from '@/features/shared/ui/skeleton'

/**
 * Skeleton para vistas tipo tabla (header, búsqueda, filas, paginación).
 * Reutilizable en Negocios, Pre-liquidación, Historial de cargas.
 */
export function TableLoadingSkeleton() {
	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<Skeleton className="h-7 w-44" />
				<Skeleton className="h-10 w-40 rounded-md" />
			</div>
			<Skeleton className="h-10 w-full max-w-sm rounded-md" />
			<div className="border rounded-lg overflow-hidden border-border">
				<div className="bg-muted/30 dark:bg-muted/20 p-4 flex gap-4 flex-wrap">
					{[80, 100, 120, 150, 80, 100, 100, 80, 80].map((w, i) => (
						<Skeleton key={i} className="h-4" style={{ width: w }} />
					))}
				</div>
				{[1, 2, 3, 4, 5].map((row) => (
					<div key={row} className="p-4 flex gap-4 items-center border-t border-border">
						<Skeleton className="h-4 w-16" />
						<Skeleton className="h-4 w-24" />
						<div className="flex items-center gap-2">
							<Skeleton className="h-8 w-8 rounded-full" />
							<Skeleton className="h-4 w-28" />
						</div>
						<Skeleton className="h-4 w-36" />
						<Skeleton className="h-4 w-16" />
						<Skeleton className="h-4 w-20" />
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-4 w-20" />
						<Skeleton className="h-6 w-20 rounded-full" />
						<div className="flex gap-1">
							<Skeleton className="h-8 w-8 rounded-md" />
							<Skeleton className="h-8 w-8 rounded-md" />
						</div>
					</div>
				))}
			</div>
			<div className="flex justify-between items-center pt-2">
				<Skeleton className="h-4 w-32" />
				<div className="flex gap-2">
					<Skeleton className="h-8 w-8 rounded-md" />
					<Skeleton className="h-8 w-8 rounded-md" />
					<Skeleton className="h-8 w-8 rounded-md" />
				</div>
			</div>
		</div>
	)
}

/**
 * Skeleton para secciones con cards de resumen + bloque tipo tabla.
 * Usado en Pre-liquidación (resumen + lista de archivos).
 */
export function SectionWithStatsLoadingSkeleton() {
	return (
		<div className="space-y-6">
			{/* Filtros */}
			<div className="flex justify-end">
				<div className="flex items-center gap-3">
					<Skeleton className="h-9 w-32 rounded-md" />
					<Skeleton className="h-9 w-24 rounded-md" />
				</div>
			</div>
			{/* Cards de resumen */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				{[1, 2, 3, 4].map((i) => (
					<div
						key={i}
						className="rounded-lg border border-border bg-card p-4 shadow-sm"
					>
						<div className="flex items-center justify-between">
							<div className="space-y-2">
								<Skeleton className="h-4 w-20" />
								<Skeleton className="h-8 w-12" />
							</div>
							<Skeleton className="h-8 w-8 rounded" />
						</div>
					</div>
				))}
			</div>
			{/* Bloque tipo lista/tabla */}
			<div className="rounded-lg border border-border bg-card p-6 shadow-sm">
				<div className="flex items-center gap-2 mb-4">
					<Skeleton className="h-5 w-5" />
					<Skeleton className="h-5 w-56" />
				</div>
				<div className="space-y-3">
					{[1, 2, 3, 4, 5].map((i) => (
						<div
							key={i}
							className="flex items-center gap-4 border-b border-border pb-3 last:border-0"
						>
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-4 w-32" />
							<Skeleton className="h-4 w-20" />
							<Skeleton className="h-4 w-16" />
							<Skeleton className="h-8 w-24 rounded-md ml-auto" />
						</div>
					))}
				</div>
			</div>
		</div>
	)
}

/**
 * Skeleton para la tabla de registros de pre-liquidacion.
 * Replica la estructura de RegistrosLiquidacionTable.
 */
export function RegistrosLiquidacionSkeleton({ rows = 8 }: { rows?: number }) {
	const colWidths = [10, 80, 100, 70, 60, 70, 70, 100, 100, 80]
	return (
		<div className="rounded-lg border border-border overflow-hidden shadow-sm">
			<div className="overflow-x-auto">
				<table className="w-full text-sm">
					<thead>
						<tr className="bg-muted/60 border-b border-border">
							{colWidths.map((w, i) => (
								<th key={i} className="py-3 px-4">
									<Skeleton className="h-3" style={{ width: w }} />
								</th>
							))}
						</tr>
					</thead>
					<tbody className="divide-y divide-border">
						{Array.from({ length: rows }).map((_, i) => (
							<tr key={i} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
								<td className="py-3 px-4 text-center">
									<Skeleton className="h-4 w-4 rounded mx-auto" />
								</td>
								<td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
								<td className="py-3 px-4"><Skeleton className="h-4 w-28" /></td>
								<td className="py-3 px-4 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
								<td className="py-3 px-4 text-right"><Skeleton className="h-4 w-10 ml-auto" /></td>
								<td className="py-3 px-4 text-right"><Skeleton className="h-4 w-10 ml-auto" /></td>
								<td className="py-3 px-4 text-center"><Skeleton className="h-5 w-10 rounded-full mx-auto" /></td>
								<td className="py-3 px-4 text-center"><Skeleton className="h-5 w-10 rounded-full mx-auto" /></td>
								<td className="py-3 px-4"><Skeleton className="h-4 w-24" /></td>
								<td className="py-3 px-4">
									<div className="flex items-center justify-end gap-1.5">
										<Skeleton className="h-7 w-16 rounded-md" />
										<Skeleton className="h-7 w-20 rounded-md" />
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	)
}

/**
 * Skeleton mínimo para "cargando tabla" (solo filas, sin header ni paginación).
 * Útil en Historial de cargas o listas simples.
 */
export function TableRowsLoadingSkeleton({ rows = 5 }: { rows?: number }) {
	return (
		<div className="border rounded-lg overflow-hidden border-border">
			<div className="bg-muted/30 dark:bg-muted/20 p-3 flex gap-2 flex-wrap">
				<Skeleton className="h-4 w-20" />
				<Skeleton className="h-4 w-24" />
				<Skeleton className="h-4 w-28" />
				<Skeleton className="h-4 w-20" />
				<Skeleton className="h-4 w-24" />
			</div>
			{Array.from({ length: rows }).map((_, i) => (
				<div
					key={i}
					className="p-3 flex gap-2 items-center border-t border-border"
				>
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-4 w-28" />
					<Skeleton className="h-4 w-20" />
					<Skeleton className="h-4 w-16" />
					<Skeleton className="h-4 w-20" />
				</div>
			))}
		</div>
	)
}
