'use client'

import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/features/shared/ui/dialog'

interface BusinessObservationsModalProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	businessId: number
	contract: string | null
	observations: string | null
}

export function BusinessObservationsModal({
	open,
	onOpenChange,
	businessId,
	contract,
	observations,
}: BusinessObservationsModalProps) {
	const displayText = observations?.trim().replace(/^\[(CANCELADO|ELIMINADO)\]\s*/, '') || 'Sin observación registrada.'

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>
						Motivo de cancelación
						{contract
							? ` — ${contract}`
							: ` — #${businessId}`}
					</DialogTitle>
				</DialogHeader>

				<p className="whitespace-pre-wrap rounded-md border bg-muted/40 px-4 py-3 text-sm text-foreground">
					{displayText}
				</p>
			</DialogContent>
		</Dialog>
	)
}
