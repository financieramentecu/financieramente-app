'use client'

import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import {
	Tabs,
	TabsList,
	TabsTrigger,
	TabsContent,
} from '@/features/shared/ui/tabs'
import { CargarArchivoTab } from '@/features/load-file/components/CargarArchivoTab'
import { HistorialCargasTab } from '@/features/load-file/components/HistorialCargasTab'
import type { CargaHistorial } from '@/features/load-file/hooks/use-file-history'

/**
 * Página de Carga de Archivos
 *
 * Permite cargar archivos mensuales de covers de Skandia para procesar información de negocios emitidos
 */

const canDeleteActiveFile = (carga: CargaHistorial): boolean =>
	carga.estado === 'LOAD'

const canDeleteCompletedFile = (_carga: CargaHistorial): boolean => false

export default function CargaArchivosPage() {
	const router = useRouter()

	const handleGoToLiquidacion = () => {
		router.push('/dashboard/liquidaciones')
	}

	return (
		<DashboardLayout currentPage="Carga Archivos">
			<div className="space-y-6">
				{/* Título y descripción */}
				<div>
					<h1 className="text-3xl font-bold text-primary">
						Carga archivos Skandia
					</h1>
					<p className="text-muted-foreground mt-2">
						Carga archivos mensuales de covers de Skandia para procesar
						información de negocios emitidos
					</p>
				</div>

				{/* Tabs */}
				<Tabs defaultValue="cargar" className="space-y-4">
					<TabsList>
						<TabsTrigger value="cargar">Cargar archivo</TabsTrigger>
						<TabsTrigger value="archivos">En proceso</TabsTrigger>
						<TabsTrigger value="historial">Historial de cargas</TabsTrigger>
					</TabsList>

					<TabsContent value="cargar">
						<CargarArchivoTab />
					</TabsContent>

					<TabsContent value="archivos">
						<HistorialCargasTab
							allowedStatuses={['PROCESSING', 'PRE-SETTLED', 'LOAD', 'COMPLETED']}
							canDeleteFn={canDeleteActiveFile}
							showPreliquidarAction={true}
							onGoToLiquidacion={handleGoToLiquidacion}
						/>
					</TabsContent>

					<TabsContent value="historial">
						<HistorialCargasTab
							allowedStatuses={['COMPLETED', 'ERROR', 'CANCELADO']}
							title="Detalle"
							canDeleteFn={canDeleteCompletedFile}
							emptyStateDescription="No hay archivos en el historial"
							showPreliquidarAction={false}
							onGoToLiquidacion={handleGoToLiquidacion}
						/>
					</TabsContent>
				</Tabs>
			</div>
		</DashboardLayout>
	)
}
