'use client'

import Link from 'next/link'
import { useState, Suspense } from 'react'
import {
	Receipt,
	FileText,
	Calendar,
	CheckCircle2,
	Clock,
	ArrowRight,
	Loader2,
} from 'lucide-react'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { EmptyState } from '@/features/shared/ui/empty-state'
import { Badge } from '@/features/shared/ui/badge'
import { useMisArchivos } from '@/features/mis-distribuciones/hooks/use-mis-archivos'
import {
	formatCurrency,
	formatDate,
	formatPeriodo,
} from '@/features/mis-distribuciones/lib/format-utils'
import { useSearchParams } from 'next/navigation'

/**
 * Listado de archivos / meses con distribución para el usuario actual.
 * Acepta `?userId=` para que líderes o backoffice con jerarquía consulten a
 * otro usuario; el acceso se valida server-side.
 */
function MisDistribucionesContent() {
	const searchParams = useSearchParams()
	const userIdParam = searchParams.get('userId')
	const targetUserId = userIdParam ? Number(userIdParam) : undefined

	const [query, setQuery] = useState('')
	const { archivos, nombreUsuario, isLoading, error } = useMisArchivos(
		Number.isFinite(targetUserId) ? targetUserId : undefined
	)

	const filtered = query
		? archivos.filter((a) => {
				const needle = query.toLowerCase()
				return (
					a.nombreArchivo.toLowerCase().includes(needle) ||
					a.periodo.toLowerCase().includes(needle) ||
					formatPeriodo(a.periodo).toLowerCase().includes(needle)
				)
			})
		: archivos

	return (
		<DashboardLayout currentPage="Mis distribuciones">
			<div className="container mx-auto py-8 px-4 max-w-6xl">
				<header className="mb-6">
					<div className="flex items-center gap-3">
						<Receipt className="h-8 w-8 text-primary" />
						<div>
							<h1 className="text-3xl font-bold text-primary">
								Mis distribuciones
							</h1>
							{nombreUsuario && targetUserId && (
								<p className="text-muted-foreground text-sm">
									Vista de <span className="font-medium">{nombreUsuario}</span>{' '}
									(userId {targetUserId})
								</p>
							)}
						</div>
					</div>
					<p className="mt-2 text-muted-foreground">
						Consulta el detalle mensual de tus comisiones y aprueba la
						pre-liquidación cuando corresponda.
					</p>
				</header>

				<div className="mb-4">
					<input
						type="text"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Buscar por archivo o mes…"
						className="w-full max-w-md rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
					/>
				</div>

				{isLoading ? (
					<div className="flex items-center gap-2 text-muted-foreground">
						<Loader2 className="h-4 w-4 animate-spin" />
						Cargando distribuciones…
					</div>
				) : error ? (
					<div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
						{error}
					</div>
				) : filtered.length === 0 ? (
					<EmptyState
						icon={<FileText className="h-12 w-12" />}
						title={
							archivos.length === 0
								? 'Aún no tienes distribuciones'
								: 'No hay coincidencias'
						}
					/>
				) : (
					<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
						{filtered.map((a) => {
							const href = targetUserId
								? `/dashboard/mis-distribuciones/${a.idFileImport}?userId=${targetUserId}`
								: `/dashboard/mis-distribuciones/${a.idFileImport}`
							const estado = a.estado.toUpperCase()
							return (
								<Link
									key={a.idFileImport}
									href={href}
									className="group flex flex-col rounded-lg border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/40 hover:shadow"
								>
									<div className="flex items-start justify-between gap-3">
										<div className="min-w-0">
											<div className="flex items-center gap-2">
												<Calendar className="h-4 w-4 text-muted-foreground" />
												<p className="text-sm font-semibold text-foreground">
													{formatPeriodo(a.periodo)}
												</p>
											</div>
											<p
												className="mt-1 text-xs text-muted-foreground truncate"
												title={a.nombreArchivo}
											>
												{a.nombreArchivo}
											</p>
										</div>
										<EstadoIndicator estado={estado} aprobado={a.aprobado} />
									</div>

									<div className="mt-3 grid grid-cols-3 gap-2 text-xs">
										<div>
											<p className="text-muted-foreground">Neta</p>
											<p className="font-semibold tabular-nums text-primary">
												{formatCurrency(a.totalNeta)}
											</p>
										</div>
										<div>
											<p className="text-muted-foreground">Negocios</p>
											<p className="font-semibold tabular-nums text-foreground">
												{a.countNegocios}
											</p>
										</div>
										<div>
											<p className="text-muted-foreground">Contratos</p>
											<p className="font-semibold tabular-nums text-foreground">
												{a.countContratos}
											</p>
										</div>
									</div>

									<div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
										<span>
											Pre-liq: {formatDate(a.fechaPreLiquidacion)}
											{a.fechaLiquidacion
												? ` · Liq: ${formatDate(a.fechaLiquidacion)}`
												: ''}
										</span>
										<span className="inline-flex items-center gap-1 text-primary group-hover:translate-x-0.5 transition-transform">
											Ver recibo
											<ArrowRight className="h-3 w-3" />
										</span>
									</div>
								</Link>
							)
						})}
					</div>
				)}
			</div>
		</DashboardLayout>
	)
}

export default function MisDistribucionesPage() {
	return (
		<Suspense fallback={
			<DashboardLayout currentPage="Mis distribuciones">
				<div className="flex items-center justify-center p-12 text-muted-foreground">
					<Loader2 className="h-8 w-8 animate-spin" />
				</div>
			</DashboardLayout>
		}>
			<MisDistribucionesContent />
		</Suspense>
	)
}

function EstadoIndicator({
	estado,
	aprobado,
}: {
	estado: string
	aprobado: boolean
}) {
	if (estado === 'SETTLED' || estado === 'COMPLETED') {
		return (
			<Badge className="bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 hover:bg-emerald-50">
				<CheckCircle2 className="mr-1 h-3 w-3" /> Liquidado
			</Badge>
		)
	}
	if (estado === 'PRE-SETTLED') {
		return (
			<Badge
				className={
					aprobado
						? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 hover:bg-emerald-50'
						: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20 hover:bg-amber-50'
				}
			>
				<Clock className="mr-1 h-3 w-3" />
				{aprobado ? 'Aprobado' : 'En revisión'}
			</Badge>
		)
	}
	return (
		<Badge className="bg-muted text-muted-foreground hover:bg-muted">
			{estado}
		</Badge>
	)
}
