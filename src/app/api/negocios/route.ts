/**
 * API Route: /api/negocios
 * GET - Listar negocios con paginación y filtros
 */

import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { BusinessListResponse } from '@/features/negocios/types/business-api.types'
import {
	businessWithRelations
} from '@/features/negocios/types/business-prisma.types'
import { businessListParamsSchema } from '@/features/negocios/lib/business-api.schemas'
import type { BusinessStatus } from '@/features/negocios/types/business-entity.types'
import { buildBusinessListWhere } from '@/features/negocios/lib/build-business-list-where'
import { toBusinessListFilterInput } from '@/features/negocios/lib/to-business-list-filter-input'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { resolveVisibleUserIds } from '@/features/negocios/services/user-hierarchy.service'
import { prismaBusinessListToEntities } from '@/features/negocios/mappers/business-entity.mapper'

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
			statuses: searchParams.getAll('statuses') as BusinessStatus[],
			dateFrom: searchParams.get('dateFrom'),
			dateTo: searchParams.get('dateTo'),
			createdFrom: searchParams.get('createdFrom'),
			createdTo: searchParams.get('createdTo'),
			dateIssuedFrom: searchParams.get('dateIssuedFrom'),
			dateIssuedTo: searchParams.get('dateIssuedTo'),
			agentName: searchParams.get('agentName'),
			hasSupports: searchParams.get('hasSupports'),
			sortBy: searchParams.get('sortBy'),
			sortOrder: searchParams.get('sortOrder'),
			companyIds: searchParams.getAll('companyIds').map(Number).filter(n => !Number.isNaN(n)),
			productIds: searchParams.getAll('productIds').map(Number).filter(n => !Number.isNaN(n)),
			originIds: searchParams.getAll('originIds').map(Number).filter(n => !Number.isNaN(n)),
			terms: searchParams.getAll('terms').map(Number).filter(n => !Number.isNaN(n)),
			periodicityIds: searchParams.getAll('periodicityIds').map(Number).filter(n => !Number.isNaN(n)),
			agentCategoryIds: searchParams.getAll('agentCategoryIds').map(Number).filter(n => !Number.isNaN(n)),
			agentIds: searchParams.getAll('agentIds').map(Number).filter(n => !Number.isNaN(n)),
			novedadStatuses: searchParams.getAll('novedadStatuses'),
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

		const {
			page,
			pageSize,
			search,
			status,
			statuses,
			dateFrom,
			dateTo,
			createdFrom,
			createdTo,
			dateIssuedFrom,
			dateIssuedTo,
			agentName,
			hasSupports,
			sortBy,
			sortOrder,
			companyIds,
			productIds,
			originIds,
			terms,
			periodicityIds,
			agentCategoryIds,
			agentIds,
			novedadStatuses,
		} = validationResult.data

		// Obtener usuario actual
		const currentUser = await getCurrentUserByEmail(session.user.email)

		if (!currentUser) {
			return NextResponse.json(
				{ data: null, error: 'Usuario no encontrado' },
				{ status: 404 }
			)
		}

		// Visibility scope:
		// ADMIN-like roles → no idUser filter (see all)
		// All other roles → hierarchical scope: [self, ...subordinates]
		const visibleUserIds = await resolveVisibleUserIds(prisma, currentUser)

		const where = buildBusinessListWhere(
			currentUser,
			toBusinessListFilterInput({
				search,
				status,
				statuses: statuses && statuses.length > 0 ? (statuses as string[]) : undefined,
				dateFrom,
				dateTo,
				createdFrom,
				createdTo,
				dateIssuedFrom,
				dateIssuedTo,
				agentName,
				hasSupports,
				companyIds: companyIds && companyIds.length > 0 ? companyIds : undefined,
				productIds: productIds && productIds.length > 0 ? productIds : undefined,
				originIds: originIds && originIds.length > 0 ? originIds : undefined,
				terms: terms && terms.length > 0 ? terms : undefined,
				periodicityIds: periodicityIds && periodicityIds.length > 0 ? periodicityIds : undefined,
				agentCategoryIds: agentCategoryIds && agentCategoryIds.length > 0 ? agentCategoryIds : undefined,
				agentIds: agentIds && agentIds.length > 0 ? agentIds : undefined,
				novedadStatuses:
					novedadStatuses && novedadStatuses.length > 0
						? novedadStatuses
						: undefined,
			}),
			{ visibleUserIds }
		)

		const dir: Prisma.SortOrder = sortOrder === 'asc' ? 'asc' : 'desc'

		// Construir orderBy basado en sortBy
		let orderBy: Prisma.BusinessOrderByWithRelationInput[]
		if (sortBy === 'agentName') {
			orderBy = [
				{ user: { name: dir } },
				{ user: { lastName: dir } },
			]
		} else if (sortBy === 'status') {
			orderBy = [{ status: dir }, { createdAt: 'desc' }, { idBusiness: 'desc' }]
		} else if (sortBy === 'value') {
			orderBy = [{ value: dir }, { createdAt: 'desc' }, { idBusiness: 'desc' }]
		} else if (sortBy === 'clientName') {
			orderBy = [
				{ client: { name: dir } },
				{ client: { lastName: dir } },
			]
		} else if (sortBy === 'identification') {
			orderBy = [{ client: { identityNumber: dir } }]
		} else if (sortBy === 'contract') {
			orderBy = [{ contract: dir }]
		} else if (sortBy === 'companyName') {
			orderBy = [{ productPercentageCommission: { productConfiguration: { product: { company: { name: dir } } } } }]
		} else if (sortBy === 'product') {
			orderBy = [{ productPercentageCommission: { productConfiguration: { product: { name: dir } } } }]
		} else if (sortBy === 'term') {
			orderBy = [{ term: dir }]
		} else if (sortBy === 'periodicityName') {
			orderBy = [{ buyPeriodicity: { name: dir } }]
		} else if (sortBy === 'dateIssued') {
			orderBy = [{ dateIssued: dir }]
		} else if (sortBy === 'dateAnchored') {
			orderBy = [{ dateAnchored: dir }]
		} else if (sortBy === 'clientOriginName') {
			orderBy = [{ clientOrigin: { name: dir } }]
		} else if (sortBy === 'createdAt') {
			orderBy = [{ createdAt: dir }, { idBusiness: 'desc' }]
		} else {
			// default: createdAt desc
			orderBy = [{ createdAt: 'desc' }, { idBusiness: 'desc' }]
		}

		// Obtener total y negocios
		const [total, businesses] = await Promise.all([
			prisma.business.count({ where }),
			prisma.business.findMany({
				where,
				include: businessWithRelations,
				orderBy,
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
