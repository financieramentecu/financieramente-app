'use client'

import { useState } from 'react'
import { Mail, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/features/shared/ui/button'

interface BotonNotificarDistribucionProps {
	fileId: number
	/** Opcional: cuando se envía, solo notifica a este beneficiario. */
	idUser?: number
	/**
	 * Forzar el tipo de correo. Si se omite, se infiere del estado del
	 * archivo (PRE-SETTLED → PRE_LIQUIDACION, SETTLED/COMPLETED → LIQUIDACION).
	 */
	kind?: 'PRE_LIQUIDACION' | 'LIQUIDACION'
	label?: string
	size?: 'sm' | 'default' | 'lg'
	variant?: 'default' | 'outline'
}

/**
 * Disparador de notificación de distribución por correo electrónico.
 * Encapsula la llamada a POST /api/pre-liquidacion/notificar.
 */
export function BotonNotificarDistribucion({
	fileId,
	idUser,
	kind,
	label,
	size = 'default',
	variant = 'default',
}: BotonNotificarDistribucionProps) {
	const [loading, setLoading] = useState(false)

	async function handleClick() {
		if (loading) return
		setLoading(true)
		try {
			const res = await fetch('/api/pre-liquidacion/notificar', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					fileImportId: fileId,
					...(idUser ? { idUser } : {}),
					...(kind ? { kind } : {}),
				}),
			})
			const body = (await res.json().catch(() => ({}))) as {
				mensaje?: string
				error?: string
				enviados?: number
				fallidos?: number
			}
			if (!res.ok) {
				toast.error(body.error || `Error ${res.status}`)
				return
			}
			const enviados = body.enviados ?? 0
			const fallidos = body.fallidos ?? 0
			if (enviados === 0 && fallidos === 0) {
				toast.message(
					body.mensaje || 'No hay beneficiarios para notificar'
				)
			} else if (fallidos === 0) {
				toast.success(`Notificaciones enviadas: ${enviados}`)
			} else {
				toast.warning(
					`Enviadas: ${enviados}, fallidas: ${fallidos}.`
				)
			}
		} catch (err) {
			toast.error(
				err instanceof Error
					? err.message
					: 'Error al enviar notificaciones'
			)
		} finally {
			setLoading(false)
		}
	}

	return (
		<Button
			type="button"
			size={size}
			variant={variant}
			onClick={handleClick}
			disabled={loading}
			className="cursor-pointer"
		>
			{loading ? (
				<Loader2 className="mr-2 h-4 w-4 animate-spin" />
			) : (
				<Mail className="mr-2 h-4 w-4" />
			)}
			{label ?? 'Notificar'}
		</Button>
	)
}
