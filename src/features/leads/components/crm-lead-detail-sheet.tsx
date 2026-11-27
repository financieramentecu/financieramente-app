'use client'

import { usePermissions } from '@/features/shared/hooks/use-permissions'
import { useFeatureFlag } from '@/features/shared/hooks/use-feature-flag'
import { LeadDetailSheet } from '@/features/leads/components/lead-detail-sheet'
import type { ActivityFocus } from '@/features/leads/agenda/agenda.types'
import type { AssignedLeadOwner } from '@/features/leads/hooks/use-assign-lead-owner'
import type { LeadDetail } from '@/features/leads/types/lead.types'

/** Lead detail sheet wired to the viewer's CRM feature flags. */
export function CrmLeadDetailSheet({
	lead,
	open,
	onOpenChange,
	onDeleted,
	onOwnerAssigned,
	activityFocus = null,
	onActivityChanged,
	previewName = null,
	loadError = null,
	onSelectLead,
}: {
	lead: LeadDetail | null
	open: boolean
	onOpenChange: (open: boolean) => void
	onDeleted?: () => void
	onOwnerAssigned?: (owner: AssignedLeadOwner) => void
	activityFocus?: ActivityFocus | null
	onActivityChanged?: () => void
	previewName?: string | null
	loadError?: string | null
	onSelectLead?: (idLead: number) => void
}) {
	const { can } = usePermissions()
	const { enabled: timelineEnabled } = useFeatureFlag('crm_timeline')
	const { enabled: tasksEnabled } = useFeatureFlag('crm_tasks')
	const { enabled: conversionAuditEnabled } = useFeatureFlag(
		'crm_conversion_audit'
	)
	const { enabled: casesEnabled } = useFeatureFlag('crm_cases')
	const { enabled: crmFieldsEnabled } = useFeatureFlag('crm_lead_fields')

	return (
		<LeadDetailSheet
			lead={lead}
			onSelectLead={onSelectLead}
			open={open}
			onOpenChange={onOpenChange}
			isAdmin={can('leads.eliminar')}
			onDeleted={onDeleted}
			onOwnerAssigned={onOwnerAssigned}
			timelineEnabled={timelineEnabled}
			tasksEnabled={tasksEnabled}
			conversionAuditEnabled={conversionAuditEnabled}
			casesEnabled={casesEnabled}
			crmFieldsEnabled={crmFieldsEnabled}
			canManageCrm={can('leads.gestionar')}
			activityFocus={activityFocus}
			onActivityChanged={onActivityChanged}
			previewName={previewName}
			loadError={loadError}
		/>
	)
}
