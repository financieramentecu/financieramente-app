/**
 * Mapper para transformar ClientOrigin de Prisma a ClientOrigin type
 * Responsabilidad única: conversión de datos de base de datos a dominio
 */

import type { ClientOrigin } from '../types/client-origin.types'
import type { Prisma } from '@prisma/client'

type PrismaClientOrigin = Prisma.ClientOriginGetPayload<Record<string, never>>

/**
 * Transforma un ClientOrigin de Prisma a ClientOrigin type
 *
 * @param prisma - ClientOrigin de Prisma
 * @returns ClientOrigin para uso en la UI
 *
 * @example
 * ```typescript
 * const prismaClientOrigin = await prisma.clientOrigin.findUnique({
 *   where: { idClientOrigin: 1 },
 * })
 * const clientOrigin = prismaClientOriginToClientOrigin(prismaClientOrigin)
 * ```
 */
export function prismaClientOriginToClientOrigin(
	prisma: PrismaClientOrigin
): ClientOrigin {
	return {
		idClientOrigin: prisma.idClientOrigin,
		name: prisma.name,
		description: prisma.description,
		status: prisma.status,
		createdAt: prisma.createdAt.toISOString(), // Date → string
		updatedAt: prisma.updatedAt.toISOString(), // Date → string
	}
}

/**
 * Transforma una lista de ClientOrigin de Prisma a ClientOrigin[]
 */
export function prismaClientOriginListToClientOrigins(
	prismaList: PrismaClientOrigin[]
): ClientOrigin[] {
	return prismaList.map(prismaClientOriginToClientOrigin)
}
