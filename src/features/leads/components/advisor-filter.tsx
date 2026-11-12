'use client'

import { MultiSelect } from '@/features/shared/ui/multi-select'
import { useHierarchyAdvisors } from '@/features/leads/hooks/use-hierarchy-advisors'
import { cn } from '@/lib/utils'

interface AdvisorFilterProps {
	value: number[]
	onChange: (ownerIds: number[]) => void
	/** Shows the "Asesores" caption. The table toolbar uses the placeholder alone. */
	labeled?: boolean
	className?: string
}

/** Multi-select of the viewer's hierarchy. Empty selection means everyone in scope. */
export function AdvisorFilter({ value, onChange, labeled = true, className }: AdvisorFilterProps) {
	const state = useHierarchyAdvisors()
	const options =
		state.status === 'success'
			? state.data.map((advisor) => ({ value: String(advisor.idUser), label: advisor.name }))
			: []

	return (
		<div className={cn('flex w-60 flex-col gap-1.5', className)}>
			{labeled && (
				<span className="text-xs font-medium text-slate-600 dark:text-slate-300">Asesores</span>
			)}
			<MultiSelect
				ariaLabel="Asesores"
				options={options}
				value={value.map(String)}
				onChange={(next) => onChange(next.map(Number))}
				placeholder={state.status === 'loading' ? 'Cargando asesores…' : 'Todos los asesores'}
				disabled={state.status !== 'success'}
			/>
		</div>
	)
}
