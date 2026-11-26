import type { Prisma, PrismaClient } from '@prisma/client'
import type { BusinessListResponse } from '@/features/negocios/types/business-api.types'
import type { BusinessListParamsSchema } from '@/features/negocios/lib/business-api.schemas'
import { businessWithRelations } from '@/features/negocios/types/business-prisma.types'
import { buildBusinessListWhere } from '@/features/negocios/lib/build-business-list-where'
import { toBusinessListFilterInput } from '@/features/negocios/lib/to-business-list-filter-input'
import { prismaBusinessListToEntities } from '@/features/negocios/mappers/business-entity.mapper'

type ListUser = Parameters<typeof buildBusinessListWhere>[0]

function nonEmpty<T>(values: T[] | undefined): T[] | undefined {
	return values && values.length > 0 ? values : undefined
}

function buildOrderBy(
	sortBy: BusinessListParamsSchema['sortBy'],
	sortOrder: BusinessListParamsSchema['sortOrder']
): Prisma.BusinessOrderByWithRelationInput[] {
	const dir: Prisma.SortOrder = sortOrder === 'asc' ? 'asc' : 'desc'

	switch (sortBy) {
		case 'agentName':
			return [{ user: { name: dir } }, { user: { lastName: dir } }]
		case 'status':
			return [{ status: dir }, { createdAt: 'desc' }, { idBusiness: 'desc' }]
		case 'value':
			return [{ value: dir }, { createdAt: 'desc' }, { idBusiness: 'desc' }]
		case 'clientName':
			return [{ client: { name: dir } }, { client: { lastName: dir } }]
		case 'identification':
			return [{ client: { identityNumber: dir } }]
		case 'contract':
			return [{ contract: dir }]
		case 'companyName':
			return [{ productPercentageCommission: { productConfiguration: { product: { company: { name: dir } } } } }]
		case 'product':
			return [{ productPercentageCommission: { productConfiguration: { product: { name: dir } } } }]
		case 'term':
			return [{ term: dir }]
		case 'periodicityName':
			return [{ buyPeriodicity: { name: dir } }]
		case 'dateIssued':
			return [{ dateIssued: dir }]
		case 'dateAnchored':
			return [{ dateAnchored: dir }]
		case 'clientOriginName':
			return [{ clientOrigin: { name: dir } }]
		case 'createdAt':
			return [{ createdAt: dir }, { idBusiness: 'desc' }]
		default:
			return [{ createdAt: 'desc' }, { idBusiness: 'desc' }]
	}
}

/**
 * Paginated business list for an already-resolved visibility scope.
 *
 * `visibleUserIds` comes from `resolveVisibleUserIds` (undefined = global
 * visibility). The caller resolves it so the list and the KPIs of one page
 * load can share a single hierarchy lookup.
 */
export async function listBusinesses(
	prisma: Pick<PrismaClient, 'business'>,
	currentUser: ListUser,
	params: BusinessListParamsSchema,
	visibleUserIds: number[] | undefined
): Promise<BusinessListResponse> {
	const { page, pageSize } = params

	const where = buildBusinessListWhere(
		currentUser,
		toBusinessListFilterInput({
			search: params.search,
			status: params.status,
			statuses: nonEmpty(params.statuses as string[] | undefined),
			dateFrom: params.dateFrom,
			dateTo: params.dateTo,
			createdFrom: params.createdFrom,
			createdTo: params.createdTo,
			dateIssuedFrom: params.dateIssuedFrom,
			dateIssuedTo: params.dateIssuedTo,
			agentName: params.agentName,
			hasSupports: params.hasSupports,
			companyIds: nonEmpty(params.companyIds),
			productIds: nonEmpty(params.productIds),
			originIds: nonEmpty(params.originIds),
			terms: nonEmpty(params.terms),
			periodicityIds: nonEmpty(params.periodicityIds),
			agentCategoryIds: nonEmpty(params.agentCategoryIds),
			agentIds: nonEmpty(params.agentIds),
			novedadStatuses: nonEmpty(params.novedadStatuses),
		}),
		{ visibleUserIds }
	)

	const [total, businesses] = await Promise.all([
		prisma.business.count({ where }),
		prisma.business.findMany({
			where,
			include: businessWithRelations,
			orderBy: buildOrderBy(params.sortBy, params.sortOrder),
			skip: (page - 1) * pageSize,
			take: pageSize,
		}),
	])

	return {
		businesses: prismaBusinessListToEntities(businesses),
		pagination: {
			page,
			pageSize,
			total,
			totalPages: Math.ceil(total / pageSize),
		},
	}
}
