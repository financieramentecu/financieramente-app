import { prisma } from '@/lib/prisma'
import type { ClientOrigin } from '@prisma/client'

/**
 * Server-side function to get active origins items.
 * Use this in Server Components and API Routes.
 */
export async function getClientOrigins(): Promise<ClientOrigin[]> {
	return await prisma.clientOrigin.findMany({
		where: {
			status: true,
		},
		orderBy: {
			name: 'asc',
		},
	})
}
