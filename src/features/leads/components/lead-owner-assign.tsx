'use client'

import { useState } from 'react'
import { Button } from '@/features/shared/ui/button'
import { useAssignLeadOwner } from '@/features/leads/hooks/use-assign-lead-owner'
import { useHierarchyAdvisors } from '@/features/leads/hooks/use-hierarchy-advisors'
import type { AssignedLeadOwner } from '@/features/leads/hooks/use-assign-lead-owner'

interface LeadOwnerAssignProps {
	idLead: number
	idUser: number | null
	ownerName: string | null
	onAssigned?: (owner: AssignedLeadOwner) => void
}

/** Picks one advisor from the viewer's hierarchy and assigns the lead. */
export function LeadOwnerAssign({
	idLead,
	idUser,
	ownerName,
	onAssigned,
}: LeadOwnerAssignProps) {
	const advisors = useHierarchyAdvisors()
	const { state, assign } = useAssignLeadOwner()
	const [selectedId, setSelectedId] = useState(idUser ? String(idUser) : '')
	const options = advisors.status === 'success' ? advisors.data : []
	const pending = state.status === 'loading'

	async function handleAssign() {
		const parsed = Number(selectedId)
		if (!Number.isInteger(parsed) || parsed <= 0) return
		const assigned = await assign(idLead, parsed)
		if (assigned) onAssigned?.(assigned)
	}

	return (
		<div className="space-y-2 rounded-md border border-border p-3">
			<p className="text-sm font-medium">Money Strategy</p>
			<p className="text-sm text-slate-600 dark:text-slate-300">
				{ownerName ?? 'Sin Money Strategy'}
			</p>
			<p className="text-xs text-muted-foreground">
				Si hay otros leads de la misma persona, también quedan con este Money Strategy.
			</p>
			<label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
				Money Strategy disponibles
				<select
					aria-label="Money Strategy disponibles"
					className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
					value={selectedId}
					disabled={advisors.status !== 'success' || pending}
					onChange={(event) => setSelectedId(event.target.value)}
				>
					<option value="">Selecciona un Money Strategy</option>
					{options.map((advisor) => (
						<option key={advisor.idUser} value={advisor.idUser}>
							{advisor.name}
						</option>
					))}
				</select>
			</label>
			<Button
				type="button"
				size="sm"
				disabled={!selectedId || pending}
				onClick={() => void handleAssign()}
			>
				{pending ? 'Asignando…' : 'Asignar Money Strategy'}
			</Button>
			{advisors.status === 'error' ? (
				<p role="alert" className="text-sm text-destructive">
					{advisors.error}
				</p>
			) : null}
			{state.status === 'error' ? (
				<p role="alert" className="text-sm text-destructive">
					{state.error}
				</p>
			) : null}
		</div>
	)
}
