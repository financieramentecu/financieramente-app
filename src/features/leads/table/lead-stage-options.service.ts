import { prisma } from '@/lib/prisma'

export interface LeadStageOption {
	idLeadFunnelColumn: number
	name: string
}

/** Active funnel stages in board order, for table filters. */
export function listLeadStageOptions(): Promise<LeadStageOption[]> {
	return prisma.leadFunnelColumn.findMany({
		where: { active: true },
		orderBy: { position: 'asc' },
		select: { idLeadFunnelColumn: true, name: true },
	})
}
