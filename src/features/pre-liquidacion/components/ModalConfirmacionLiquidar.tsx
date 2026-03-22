'use client'

import { ConfirmModal } from '@/features/shared/ui/modal'

interface ModalConfirmacionLiquidarProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	count: number
	onConfirmar: () => void
	isConfirmando: boolean
}

export function ModalConfirmacionLiquidar({
	open,
	onOpenChange,
	count,
	onConfirmar,
	isConfirmando: _isConfirmando,
}: ModalConfirmacionLiquidarProps) {
	return (
		<ConfirmModal
			open={open}
			onOpenChange={onOpenChange}
			message={`¿Liquidar ${count} registro(s) seleccionado(s)? Esta acción los marcará como SETTLED.`}
			confirmText="Liquidar"
			cancelText="Cancelar"
			destructive={false}
			onConfirm={onConfirmar}
			onCancel={() => onOpenChange(false)}
		/>
	)
}
