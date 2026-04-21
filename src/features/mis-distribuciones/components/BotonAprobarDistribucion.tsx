'use client'

import { CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/features/shared/ui/button'
import { useAprobarDistribucion } from '../hooks/use-aprobar-distribucion'
import { formatDate } from '../lib/format-utils'

interface BotonAprobarDistribucionProps {
	fileId: number
	aprobado: boolean
	aprobadoAt: string | null
	disabled?: boolean
	onAprobado?: () => void
}

/**
 * CTA "Estoy de acuerdo" para distribuciones en estado PRE-SETTLED.
 * Una vez aprobado, se transforma en un chip informativo con la fecha.
 */
export function BotonAprobarDistribucion({
	fileId,
	aprobado,
	aprobadoAt,
	disabled,
	onAprobado,
}: BotonAprobarDistribucionProps) {
	const { aprobar, isApproving } = useAprobarDistribucion()

	if (aprobado) {
		return (
			<div className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 ring-1 ring-inset ring-emerald-600/20">
				<CheckCircle2 className="h-4 w-4" />
				<span>
					Aprobado
					{aprobadoAt ? ` · ${formatDate(aprobadoAt)}` : ''}
				</span>
			</div>
		)
	}

	return (
		<Button
			type="button"
			onClick={async () => {
				const result = await aprobar(fileId)
				if (result && onAprobado) onAprobado()
			}}
			disabled={disabled || isApproving}
			className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm cursor-pointer"
		>
			{isApproving ? (
				<>
					<Loader2 className="mr-2 h-4 w-4 animate-spin" />
					Registrando…
				</>
			) : (
				<>
					<CheckCircle2 className="mr-2 h-4 w-4" />
					Estoy de acuerdo
				</>
			)}
		</Button>
	)
}
