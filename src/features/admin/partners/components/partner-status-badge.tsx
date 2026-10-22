import { Badge } from '@/features/shared/ui/badge'
import { PARTNER_STATUS_LABELS } from '../lib/partner-status'
import type { PartnerStatus } from '../types/partner.types'

const VARIANT_BY_STATUS = {
	PENDING: 'info',
	ACTIVE: 'success',
	DEACTIVATED: 'neutral',
} as const

export function PartnerStatusBadge({ status }: { status: PartnerStatus }) {
	return (
		<Badge variant={VARIANT_BY_STATUS[status]} className="whitespace-nowrap">
			{PARTNER_STATUS_LABELS[status]}
		</Badge>
	)
}
