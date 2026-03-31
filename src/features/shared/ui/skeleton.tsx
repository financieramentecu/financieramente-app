import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="skeleton"
			data-testid="skeleton"
			className={cn(
				// Light mode: usar un gris medio para buena visibilidad sobre fondo claro
				'bg-gray-300',
				// Dark mode: usar un gris más claro para buena visibilidad sobre fondo oscuro
				'dark:bg-gray-600',
				'animate-pulse rounded-md',
				className
			)}
			{...props}
		/>
	)
}

export { Skeleton }
