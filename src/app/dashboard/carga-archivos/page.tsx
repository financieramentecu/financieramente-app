'use client'

import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/features/shared/ui/tabs'
import { CargarArchivoTab } from './components/CargarArchivoTab'
import { HistorialCargasTab } from './components/HistorialCargasTab'

/**
 * Página de Carga de Archivos
 *
 * Permite cargar archivos mensuales de covers de Skandia para procesar información de negocios emitidos
 */
export default function CargaArchivosPage() {
	return (
		<DashboardLayout currentPage="Carga Archivos">
			<div className="space-y-6">
				{/* Título y descripción */}
				<div>
					<h1 className="text-3xl font-bold text-[#00505C]">Carga Archivos</h1>
					<p className="text-muted-foreground mt-2">
						Carga archivos mensuales de covers de Skandia para procesar información
						de negocios emitidos
					</p>
				</div>

				{/* Tabs */}
				<Tabs defaultValue="cargar" className="space-y-4">
					<TabsList>
						<TabsTrigger value="cargar">Cargar archivo</TabsTrigger>
						<TabsTrigger value="historial">Historial de cargas</TabsTrigger>
					</TabsList>

					<TabsContent value="cargar">
						<CargarArchivoTab />
					</TabsContent>

					<TabsContent value="historial">
						<HistorialCargasTab />
					</TabsContent>
				</Tabs>
			</div>
		</DashboardLayout>
	)
}

