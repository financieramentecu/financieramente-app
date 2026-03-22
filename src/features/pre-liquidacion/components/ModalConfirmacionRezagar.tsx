'use client'

import { ConfirmModal } from '@/features/shared/ui/modal'

interface ModalConfirmacionRezagarProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	count: number
	onConfirmar: () => void
	isConfirmando: boolean
}

export function ModalConfirmacionRezagar({
	open,
	onOpenChange,
	count,
	onConfirmar,
	isConfirmando: _isConfirmando,
}: ModalConfirmacionRezagarProps) {
	return (
		<ConfirmModal
			open={open}
			onOpenChange={onOpenChange}
			message={`¿Rezagar ${count} registro(s) seleccionado(s)? Se marcará la fecha de rezagado como hoy.`}
			confirmText="Rezagar"
			cancelText="Cancelar"
			destructive={false}
			onConfirm={onConfirmar}
			onCancel={() => onOpenChange(false)}
		/>
	)
}
