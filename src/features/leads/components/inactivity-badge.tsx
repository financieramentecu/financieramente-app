import { Badge } from '@/features/shared/ui/badge'

/** "Sin actividad · N días" for open leads past the inactivity threshold. */
export function InactivityBadge({ days }: { days: number | null }) {
	if (days === null) return null
	return (
		<Badge
			variant="outline"
			className="w-fit border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
			title="Este lead abierto no tiene actividades recientes en el CRM"
		>
			Sin actividad · {days} {days === 1 ? 'día' : 'días'}
		</Badge>
	)
}
