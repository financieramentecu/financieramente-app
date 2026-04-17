/**
 * API Route: /api/negocios
 * GET - Listar negocios con paginación y filtros
 */

import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { BusinessListResponse } from '@/features/negocios/types/business-api.types'
import {
	businessWithRelations
} from '@/features/negocios/types/business-prisma.types'
import { businessListParamsSchema } from '@/features/negocios/lib/business-api.schemas'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { UserRole } from '@/features/auth/lib/roles'
import { prismaBusinessListToEntities } from '@/features/negocios/mappers/business-entity.mapper'
import { Prisma } from '@prisma/client'

/**
 * GET /api/negocios
 * Lista negocios con paginación y filtros
 *
 * Query params:
 * - page: number (default 1)
 * - pageSize: number (default 10, max 100)
 * - search: string (opcional) - Búsqueda unificada por identityNumber, nombres, apellidos,
 *   email del cliente, ID del negocio y número de contrato
 * - status: 'VENTA_EFECTUADA' | 'EMITIDO' | 'CANCELADO' (opcional)
 */
export async function GET(
	request: Request
): Promise<NextResponse<ApiResponse<BusinessListResponse>>> {
	try {
		const session = await auth()

		if (!session?.user?.email) {
			return NextResponse.json(
				{ data: null, error: 'No autorizado' },
				{ status: 401 }
			)
		}

		// Parsear query params
		const { searchParams } = new URL(request.url)
		const params = {
			page: searchParams.get('page'),
			pageSize: searchParams.get('pageSize'),
			search: searchParams.get('search'),
			status: searchParams.get('status'),
		}

		const validationResult = businessListParamsSchema.safeParse(params)

		if (!validationResult.success) {
			return NextResponse.json(
				{
					data: null,
					error: validationResult.error.message || 'Parámetros inválidos',
				},
				{ status: 400 }
			)
		}

		const { page, pageSize, search, status } = validationResult.data

		// Obtener usuario actual
		const currentUser = await getCurrentUserByEmail(session.user.email)

		if (!currentUser) {
			return NextResponse.json(
				{ data: null, error: 'Usuario no encontrado' },
				{ status: 404 }
			)
		}

		// Construir filtros
		const isAgent = currentUser.role?.code === UserRole.AGENTE
		const whereConditions: Prisma.BusinessWhereInput[] = []

		// Filtro por rol (agentes solo ven sus negocios)
		if (isAgent) {
			whereConditions.push({ idUser: currentUser.idUser })
		}

		// Filtro por estado
		if (status) {
			whereConditions.push({ status })
		}

		// Filtro por búsqueda unificada
		if (search && search.trim()) {
			const searchTerm = search.trim()
			const searchNumber = parseInt(searchTerm, 10)
			const isNumeric = !isNaN(searchNumber)

			// Construir condiciones OR para búsqueda unificada
			const searchOrConditions: Prisma.BusinessWhereInput[] = [
				// Búsqueda en campos del cliente
				{
					client: {
						OR: [
							{ identityNumber: { contains: searchTerm, mode: 'insensitive' } },
							{ name: { contains: searchTerm, mode: 'insensitive' } },
							{ lastName: { contains: searchTerm, mode: 'insensitive' } },
							{ email: { contains: searchTerm, mode: 'insensitive' } },
						],
					},
				},
				// Búsqueda por número de contrato
				{
					contract: { contains: searchTerm, mode: 'insensitive' },
				},
			]

			// Si el término es numérico, también buscar por ID del negocio
			if (isNumeric) {
				searchOrConditions.push({ idBusiness: searchNumber })
			}

			whereConditions.push({ OR: searchOrConditions })
		}

		const where: Prisma.BusinessWhereInput =
			whereConditions.length > 0 ? { AND: whereConditions } : {}

		// Obtener total y negocios
		const [total, businesses] = await Promise.all([
			prisma.business.count({ where }),
			prisma.business.findMany({
				where,
				include: businessWithRelations,
				orderBy: { createdAt: 'desc' },
				skip: (page - 1) * pageSize,
				take: pageSize,
			}),
		])

		const entities = prismaBusinessListToEntities(businesses)
		const totalPages = Math.ceil(total / pageSize)

		return NextResponse.json({
			data: {
				businesses: entities,
				pagination: {
					page,
					pageSize,
					total,
					totalPages,
				},
			},
		})
	} catch (error) {
		console.error('Error al listar negocios:', error)
		return NextResponse.json(
			{ data: null, error: 'Error interno del servidor' },
			{ status: 500 }
		)
	}
}
