'use client'

import { use, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { ReciboDistribucion } from '@/features/mis-distribuciones/components/ReciboDistribucion'
import { AcordeonNegocioDistribucion } from '@/features/mis-distribuciones/components/AcordeonNegocioDistribucion'
import { BotonAprobarDistribucion } from '@/features/mis-distribuciones/components/BotonAprobarDistribucion'
import { BotonNotificarDistribucion } from '@/features/mis-distribuciones/components/BotonNotificarDistribucion'
import { useReciboDistribucion } from '@/features/mis-distribuciones/hooks/use-recibo-distribucion'

interface PageProps {
	params: Promise<{ fileId: string }>
}

/**
 * Detalle (estilo recibo) de la distribución mensual de un beneficiario.
 * Acepta `?userId=` cuando un líder o backoffice consulta el recibo de un
 * subordinado (validado server-side).
 */
export default function MisDistribucionesDetallePage({ params }: PageProps) {
	const { fileId: fileIdParam } = use(params)
	const fileId = useMemo(() => Number(fileIdParam), [fileIdParam])
	const searchParams = useSearchParams()
	const userIdParam = searchParams.get('userId')
	const targetUserId = userIdParam ? Number(userIdParam) : undefined

	const {
		recibo,
		isLoading,
		error,
		refetch,
	} = useReciboDistribucion(
		Number.isFinite(fileId) ? fileId : null,
		Number.isFinite(targetUserId) ? targetUserId : undefined
	)

	const backHref = targetUserId
		? `/dashboard/mis-distribuciones?userId=${targetUserId}`
		: '/dashboard/mis-distribuciones'

	return (
		<DashboardLayout currentPage="Mis distribuciones">
			<div className="container mx-auto py-6 px-4 max-w-6xl space-y-6">
				<div className="flex items-center justify-between gap-2">
					<Link
						href={backHref}
						className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
					>
						<ArrowLeft className="h-4 w-4" />
						Volver al listado
					</Link>
					{recibo && recibo.permisos.puedeNotificar && (
						<BotonNotificarDistribucion
							fileId={recibo.archivo.idFileImport}
							idUser={recibo.beneficiario.idUser}
							kind={
								recibo.archivo.estado === 'SETTLED' ||
								recibo.archivo.estado === 'COMPLETED'
									? 'LIQUIDACION'
									: 'PRE_LIQUIDACION'
							}
							label="Notificar por correo"
							variant="outline"
							size="sm"
						/>
					)}
				</div>

				{isLoading && (
					<div className="flex items-center gap-2 text-muted-foreground">
						<Loader2 className="h-4 w-4 animate-spin" />
						Cargando recibo…
					</div>
				)}

				{!isLoading && error && (
					<div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
						{error}
					</div>
				)}

				{!isLoading && !error && recibo && (
					<>
						<ReciboDistribucion recibo={recibo} />

						{recibo.archivo.estado === 'PRE-SETTLED' &&
							recibo.permisos.puedeAprobar && (
								<div className="flex flex-col items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/40 p-4 sm:flex-row sm:items-center sm:justify-between">
									<div>
										<p className="text-sm font-semibold text-amber-800">
											Distribución en revisión
										</p>
										<p className="text-xs text-amber-700/80">
											Revisa el detalle y confirma que estás de acuerdo con los
											cálculos.
										</p>
									</div>
									<BotonAprobarDistribucion
										fileId={recibo.archivo.idFileImport}
										aprobado={recibo.aprobacion.aprobado}
										aprobadoAt={recibo.aprobacion.aprobadoAt}
										onAprobado={refetch}
									/>
								</div>
							)}

						<section>
							<h3 className="mb-3 text-sm font-semibold text-foreground uppercase tracking-wide">
								Detalle por negocio
							</h3>
							<AcordeonNegocioDistribucion negocios={recibo.negocios} />
						</section>
					</>
				)}
			</div>
		</DashboardLayout>
	)
}
