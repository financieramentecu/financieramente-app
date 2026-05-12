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
		className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
	},
	'PRE-SETTLED': {
		label: 'Pre-liquidado',
		className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800 truncate',
	},
	COMPLETED: {
		label: 'Liquidado',
		className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800 truncate',
	},
	ERROR: {
		label: 'Error',
		className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
	},
	PROCESSING: {
		label: 'Procesando',
		className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800 animate-pulse',
	},
	PARCIAL: {
		label: 'Parcial',
		className: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
	},
	CANCELADO: {
		label: 'Cancelado',
		className: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
	},
}

export function FileStatusBadge({ status, className }: FileStatusBadgeProps) {
	const config = STATUS_CONFIG[status] ?? STATUS_CONFIG['PROCESSING']

	return (
		<Badge
			variant="outline"
			className={cn(config.className, 'font-semibold text-xs truncate', className)}
		>
			{config.label}
		</Badge>
	)
}
