import { Badge } from '@/features/shared/ui/badge'
import { cn } from '@/lib/utils'

export type FileImportStatus =
	| 'LOAD'
	| 'PRE-SETTLED'
	| 'COMPLETED'
	| 'ERROR'
	| 'PROCESSING'
	| 'PARCIAL'
	| 'CANCELADO'

export interface FileStatusBadgeProps {
	readonly status: FileImportStatus
	readonly className?: string
}

interface StatusConfig {
	readonly label: string
	readonly className: string
}

const STATUS_CONFIG: Record<FileImportStatus, StatusConfig> = {
	LOAD: {
		label: 'Sincronizado',
		className: 'bg-blue-100 text-blue-800 border-blue-200',
	},
	'PRE-SETTLED': {
		label: 'Pre-liquidado',
		className: 'bg-amber-100 text-amber-800 border-amber-200',
	},
	COMPLETED: {
		label: 'Liquidado',
		className: 'bg-green-100 text-green-800 border-green-200',
	},
	ERROR: {
		label: 'Error',
		className: 'bg-red-100 text-red-800 border-red-200',
	},
	PROCESSING: {
		label: 'Procesando',
		className: 'bg-gray-100 text-gray-800 border-gray-200',
	},
	PARCIAL: {
		label: 'Parcial',
		className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
	},
	CANCELADO: {
		label: 'Cancelado',
		className: 'bg-orange-100 text-orange-800 border-orange-200',
	},
}

export function FileStatusBadge({ status, className }: FileStatusBadgeProps) {
	const config = STATUS_CONFIG[status] ?? STATUS_CONFIG['PROCESSING']

	return (
		<Badge
			variant="outline"
			className={cn(config.className, 'font-semibold text-xs', className)}
		>
			{config.label}
		</Badge>
	)
}
