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

/**
 * Logical delete: client origins are never physically removed. Callers must
 * verify the origin is not in use before deactivating it.
 */
export async function deactivateClientOrigin(
	idClientOrigin: number
): Promise<ClientOrigin> {
	return await prisma.clientOrigin.update({
		where: { idClientOrigin },
		data: { status: false },
	})
}
