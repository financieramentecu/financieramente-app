'use client'

import { useState } from 'react'
import { Button } from '@/features/shared/ui/button'
import { SingleSelect } from '@/features/shared/ui/single-select'
import { useAssignLeadOwner } from '@/features/leads/hooks/use-assign-lead-owner'
import type { AssignedLeadOwner } from '@/features/leads/hooks/use-assign-lead-owner'
import type { HierarchyAdvisor } from '@/features/leads/types/hierarchy-advisor.types'

interface LeadOwnerAssignProps {
	idLead: number
	idUser: number | null
	ownerName: string | null
	advisors: HierarchyAdvisor[]
	advisorsReady: boolean
	advisorsError?: string
	onAssigned?: (owner: AssignedLeadOwner) => void
}

/** Picks one advisor from the viewer's hierarchy and assigns the lead. */
export function LeadOwnerAssign({
	idLead,
	idUser,
	ownerName,
	advisors,
	advisorsReady,
	advisorsError = '',
	onAssigned,
}: LeadOwnerAssignProps) {
	const { state, assign } = useAssignLeadOwner()
	const assignedId = idUser != null ? String(idUser) : ''
	const [trackedLeadId, setTrackedLeadId] = useState(idLead)
	const [trackedOwnerId, setTrackedOwnerId] = useState(assignedId)
	const [pickedId, setPickedId] = useState<string | null>(null)
	if (trackedLeadId !== idLead || trackedOwnerId !== assignedId) {
		setTrackedLeadId(idLead)
		setTrackedOwnerId(assignedId)
		setPickedId(null)
	}
	const selectedId = pickedId ?? assignedId
	const ownerListed = advisors.some((advisor) => String(advisor.idUser) === assignedId)
	const visibleOptions =
		assignedId && ownerName && idUser != null && !ownerListed
			? [{ idUser, name: ownerName }, ...advisors]
			: advisors
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
				<SingleSelect
					ariaLabel="Money Strategy disponibles"
					searchLabel="Buscar Money Strategy"
					placeholder="Selecciona un Money Strategy"
					options={visibleOptions.map((advisor) => ({
						value: String(advisor.idUser),
						label: advisor.name,
					}))}
					value={selectedId}
					disabled={!advisorsReady || pending}
					onChange={setPickedId}
				/>
			</label>
			<Button
				type="button"
				size="sm"
				disabled={!selectedId || pending}
				onClick={() => void handleAssign()}
			>
				{pending ? 'Asignando…' : 'Asignar Money Strategy'}
			</Button>
			{advisorsError ? (
				<p role="alert" className="text-sm text-destructive">
					{advisorsError}
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
