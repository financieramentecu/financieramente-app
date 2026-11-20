import { prisma } from '@/lib/prisma'

export interface LeadOriginOption {
	idClientOrigin: number
	name: string
}

/** Active rows of `client_origin`, for the pipeline and lead-table filters. */
export function listLeadOriginOptions(): Promise<LeadOriginOption[]> {
	return prisma.clientOrigin.findMany({
		where: { status: true },
		orderBy: { name: 'asc' },
		select: { idClientOrigin: true, name: true },
	})
}
