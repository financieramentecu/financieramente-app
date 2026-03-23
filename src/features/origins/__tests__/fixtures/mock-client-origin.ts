import type { Prisma } from '@prisma/client'
import type { ClientOrigin } from '../../types/origins.types'

/**
 * Crea un mock de ClientOrigin para pruebas
 */
export function createMockClientOrigin(
	overrides?: Partial<ClientOrigin>
): ClientOrigin {
	return {
		idClientOrigin: 1,
		name: 'Propio',
		description: 'Origen propio del cliente',
		status: true,
		createdAt: '2024-01-15T10:00:00.000Z',
		updatedAt: '2024-01-15T11:00:00.000Z',
		...overrides,
	}
}

/**
 * Crea un mock de Prisma ClientOrigin para pruebas
 */
export function createMockPrismaClientOrigin(
	overrides?: Partial<Prisma.ClientOriginGetPayload<Record<string, never>>>
): Prisma.ClientOriginGetPayload<Record<string, never>> {
	return {
		idClientOrigin: 1,
		name: 'Propio',
		description: 'Origen propio del cliente',
		status: true,
		createdAt: new Date('2024-01-15T10:00:00.000Z'),
		updatedAt: new Date('2024-01-15T11:00:00.000Z'),
		...overrides,
	}
}
