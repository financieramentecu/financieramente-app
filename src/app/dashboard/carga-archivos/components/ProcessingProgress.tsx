'use client'

import { Progress } from '@/features/shared/ui/progress'

interface ProcessingProgressProps {
	current: number
	total: number
	sincronizado: number
	rezagado: number
	error: number
}

export function ProcessingProgress({
	current,
	total,
	sincronizado,
	rezagado,
	error,
}: ProcessingProgressProps) {
	const percentage = total > 0 ? Math.round((current / total) * 100) : 0

	return (
		<div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
			<div className="space-y-4">
				<div>
					<div className="flex items-center justify-between mb-2">
						<h3 className="text-lg font-semibold text-[#00505C]">
							Procesando archivo...
						</h3>
						<span className="text-sm text-gray-600">
							{current} de {total} registros
						</span>
					</div>
					<Progress value={percentage} className="h-2" />
					<p className="text-sm text-gray-600 mt-2">{percentage}% completado</p>
				</div>

				{/* Estadísticas en tiempo real */}
				<div className="grid grid-cols-3 gap-4 pt-4 border-t">
					<div className="text-center">
						<p className="text-2xl font-bold text-purple-600">{sincronizado}</p>
						<p className="text-xs text-gray-600">Sincronizados</p>
					</div>
					<div className="text-center">
						<p className="text-2xl font-bold text-yellow-600">{rezagado}</p>
						<p className="text-xs text-gray-600">Rezagados</p>
					</div>
					<div className="text-center">
						<p className="text-2xl font-bold text-red-600">{error}</p>
						<p className="text-xs text-gray-600">Errores</p>
					</div>
				</div>
			</div>
		</div>
	)
}

