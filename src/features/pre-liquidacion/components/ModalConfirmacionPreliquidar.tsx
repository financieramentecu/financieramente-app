'use client'

import { ConfirmModal } from '@/features/shared/ui/modal'

interface ModalConfirmacionPreliquidarProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	onConfirmar: () => void
	isConfirmando: boolean
	fileName?: string
}

export function ModalConfirmacionPreliquidar({
	open,
	onOpenChange,
	onConfirmar,
	isConfirmando,
	fileName,
}: ModalConfirmacionPreliquidarProps) {
	return (
		<ConfirmModal
			open={open}
			onOpenChange={onOpenChange}
			title="Confirmar Pre-liquidación"
			message={`¿Está seguro de iniciar la pre-liquidación del archivo "${fileName ?? 'seleccionado'}"? Se realizarán todos los cálculos de distribución comisional para los registros sincronizados.`}
			confirmText="Iniciar Procesamiento"
			cancelText="Cancelar"
			destructive={false}
			isLoading={isConfirmando}
			onConfirm={onConfirmar}
			onCancel={() => onOpenChange(false)}
		/>
	)
}
