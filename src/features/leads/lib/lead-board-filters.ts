import type { LeadOutcomeStatus } from '@prisma/client'
import { currentBogotaMonthRange } from '@/features/shared/lib/bogota-date-range'

export interface LeadBoardFilters {
	outcomeStatuses: LeadOutcomeStatus[]
	createdAtRange: { gte: Date; lte: Date }
}

/**
 * Shared pure default filter state for the Leads board, used by BOTH the
 * `GET /api/leads` route handler and the board container (D15) so the API
 * and the UI never disagree on what "no filter params" means.
 */
export function getDefaultLeadBoardFilters(): LeadBoardFilters {
	return {
		outcomeStatuses: ['OPEN'],
		createdAtRange: currentBogotaMonthRange(),
	}
}
