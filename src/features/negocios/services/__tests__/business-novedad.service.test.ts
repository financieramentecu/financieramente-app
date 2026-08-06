import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import {
	getNovedadContext,
	updateNovedadStatus,
} from '../business-novedad.service'
import { prismaBusinessToEntity } from '@/features/negocios/mappers/business-entity.mapper'
import { BUSINESS_NOVEDAD_STATUS } from '@/features/negocios/types/business-entity.types'
import { mockPrismaBusiness } from '@/features/negocios/__tests__/fixtures/mock-prisma-business'

vi.mock('@/lib/prisma', () => ({
	prisma: {
		business: {
			findUnique: vi.fn(),
			update: vi.fn(),
		},
	},
}))
vi.mock('@/features/negocios/mappers/business-entity.mapper')

describe('business-novedad.service', () => {
	const mockFindUnique = vi.mocked(prisma.business.findUnique)
	const mockUpdate = vi.mocked(prisma.business.update)
	const mockPrismaBusinessToEntity = vi.mocked(prismaBusinessToEntity)

	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('getNovedadContext', () => {
		it('returns { business, novedadStatus } when the business exists', async () => {
			const business = {
				...mockPrismaBusiness,
				novedadStatus: BUSINESS_NOVEDAD_STATUS.NUEVA,
			}
			mockFindUnique.mockResolvedValue(business as never)

			const result = await getNovedadContext(1)

			expect(mockFindUnique).toHaveBeenCalledWith(
				expect.objectContaining({ where: { idBusiness: 1 } })
			)
			expect(result).toEqual({
				business,
				novedadStatus: BUSINESS_NOVEDAD_STATUS.NUEVA,
			})
		})

		it('returns null when the business does not exist', async () => {
			mockFindUnique.mockResolvedValue(null)

			const result = await getNovedadContext(999)

			expect(result).toBeNull()
		})
	})

	describe('updateNovedadStatus', () => {
		it('calls prisma.business.update with the target status and returns the mapped entity', async () => {
			const updated = {
				...mockPrismaBusiness,
				novedadStatus: BUSINESS_NOVEDAD_STATUS.SOMETIDA_DEVOLUCION,
			}
			mockUpdate.mockResolvedValue(updated as never)
			const mockEntity = { id: 1, novedadStatus: BUSINESS_NOVEDAD_STATUS.SOMETIDA_DEVOLUCION }
			mockPrismaBusinessToEntity.mockReturnValue(mockEntity as never)

			const result = await updateNovedadStatus(1, BUSINESS_NOVEDAD_STATUS.SOMETIDA_DEVOLUCION)

			expect(mockUpdate).toHaveBeenCalledWith({
				where: { idBusiness: 1 },
				data: { novedadStatus: BUSINESS_NOVEDAD_STATUS.SOMETIDA_DEVOLUCION },
				include: expect.any(Object),
			})
			expect(result).toEqual(mockEntity)
		})
	})
})
