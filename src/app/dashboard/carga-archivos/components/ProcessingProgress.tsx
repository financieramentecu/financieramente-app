'use client'

import { Progress } from '@/features/shared/ui/progress'
import { Button } from '@/features/shared/ui/button'

interface ProcessingProgressProps {
	current: number
	total: number
	sincronizado: number
	rezagado: number
	error: number
	onCancel?: () => void
}

export function ProcessingProgress({
	current,
	total,
	sincronizado,
	rezagado,
	error,
	onCancel,
}: ProcessingProgressProps) {
	const percentage = total > 0 ? Math.round((current / total) * 100) : 0

	return (
		<div className="bg-card rounded-lg border border-border p-6 shadow-sm">
			<div className="space-y-4">
				<div>
					<div className="flex items-center justify-between mb-2">
						<h3 className="text-lg font-semibold text-primary">
							Procesando archivo...
						</h3>
						<span className="text-sm text-muted-foreground">
							{current} de {total} registros
						</span>
					</div>
					<Progress value={percentage} className="h-2" />
					<p className="text-sm text-muted-foreground mt-2">{percentage}% completado</p>
				</div>

				{/* Estadísticas en tiempo real */}
				<div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
					<div className="text-center">
						<p className="text-2xl font-bold text-success">{sincronizado}</p>
						<p className="text-xs text-muted-foreground">Sincronizados</p>
					</div>
					<div className="text-center">
						<p className="text-2xl font-bold text-warning">{rezagado}</p>
						<p className="text-xs text-muted-foreground">Rezagados</p>
					</div>
					<div className="text-center">
						<p className="text-2xl font-bold text-destructive">{error}</p>
						<p className="text-xs text-muted-foreground">Errores</p>
					</div>
				</div>

				{/* Botón de Cancelar */}
				{onCancel && (
					<div className="flex justify-center pt-4 border-t border-border">
						<Button
							onClick={onCancel}
							className="w-full sm:w-auto bg-destructive hover:bg-destructive/90 text-destructive-foreground"
						>
							Cancelar Carga
						</Button>
					</div>
				)}
			</div>
		</div>
	)
}

