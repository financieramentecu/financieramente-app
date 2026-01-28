'use client'

import { TrendingUp, FileCheck, Clock } from 'lucide-react'
import type { ResumenArchivos } from '@/features/pre-liquidacion/types/types'

interface PanelResumenArchivosProps {
    resumen: ResumenArchivos
}

/**
 * Panel de resumen de archivos con métricas
 */
export function PanelResumenArchivos({ resumen }: PanelResumenArchivosProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Total Archivos */}
            <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground mb-1">Total Archivos</p>
                        <p className="text-3xl font-bold text-chart-1">
                            {resumen.totalArchivos}
                        </p>
                    </div>
                    <TrendingUp className="h-10 w-10 text-chart-2" />
                </div>
            </div>

            {/* Sincronizados */}
            <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground mb-1">Sincronizados</p>
                        <p className="text-3xl font-bold text-chart-3">
                            {resumen.sincronizados}
                        </p>
                    </div>
                    <Clock className="h-10 w-10 text-chart-3" />
                </div>
            </div>

            {/* Pre-liquidados */}
            <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground mb-1">Pre-liquidados</p>
                        <p className="text-3xl font-bold text-success">
                            {resumen.preLiquidados}
                        </p>
                    </div>
                    <FileCheck className="h-10 w-10 text-success" />
                </div>
            </div>
        </div>
    )
}
