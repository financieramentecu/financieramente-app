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
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-600 mb-1">Total Archivos</p>
                        <p className="text-3xl font-bold text-[#00505C]">
                            {resumen.totalArchivos}
                        </p>
                    </div>
                    <TrendingUp className="h-10 w-10 text-blue-500" />
                </div>
            </div>

            {/* Sincronizados */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-600 mb-1">Sincronizados</p>
                        <p className="text-3xl font-bold text-green-600">
                            {resumen.sincronizados}
                        </p>
                    </div>
                    <Clock className="h-10 w-10 text-green-500" />
                </div>
            </div>

            {/* Pre-liquidados */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-600 mb-1">Pre-liquidados</p>
                        <p className="text-3xl font-bold text-purple-600">
                            {resumen.preLiquidados}
                        </p>
                    </div>
                    <FileCheck className="h-10 w-10 text-purple-500" />
                </div>
            </div>
        </div>
    )
}
