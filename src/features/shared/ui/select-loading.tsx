import { Loader2 } from 'lucide-react'

export function SelectLoading() {
	return (
		<div className="flex items-center gap-1.5 text-muted-foreground text-sm">
			<Loader2 className="h-4 w-4 animate-spin shrink-0" />
			Cargando...
		</div>
	)
}
