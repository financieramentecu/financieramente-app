import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
	prisma: {
		commissionDiscount: {
			findMany: vi.fn(),
			findFirst: vi.fn(),
			create: vi.fn(),
			findUnique: vi.fn(),
			update: vi.fn(),
		},
	},
}))

import { prisma } from '@/lib/prisma'
import {
	listDiscounts,
	findActiveByType,
	createDiscount,
	findDiscountById,
	inactivateDiscount,
} from '@/features/commission-discounts/services/commission-discount.service'

const mockFindMany = vi.mocked(prisma.commissionDiscount.findMany)
const mockFindFirst = vi.mocked(prisma.commissionDiscount.findFirst)
const mockCreate = vi.mocked(prisma.commissionDiscount.create)
const mockFindUnique = vi.mocked(prisma.commissionDiscount.findUnique)
const mockUpdate = vi.mocked(prisma.commissionDiscount.update)

beforeEach(() => {
	vi.clearAllMocks()
})

describe('listDiscounts', () => {
	it('returns array from prisma', async () => {
		const rows = [{ id: 1, name: 'Test', type: 'IMPUESTO', status: 'ACTIVE' }]
		mockFindMany.mockResolvedValue(rows as never)
		const result = await listDiscounts()
		expect(result).toEqual(rows)
		expect(mockFindMany).toHaveBeenCalledWith({
			include: { createdBy: true, updatedBy: true },
			orderBy: { createdAt: 'desc' },
		})
	})
})

describe('findActiveByType', () => {
	it('calls findFirst with type and ACTIVE status filter', async () => {
		const row = { id: 1, type: 'IMPUESTO', status: 'ACTIVE' }
		mockFindFirst.mockResolvedValue(row as never)
		const result = await findActiveByType('IMPUESTO')
		expect(result).toEqual(row)
		expect(mockFindFirst).toHaveBeenCalledWith({
			where: { type: 'IMPUESTO', status: 'ACTIVE' },
		})
	})

	it('returns null when no active discount for type', async () => {
		mockFindFirst.mockResolvedValue(null as never)
		const result = await findActiveByType('CLAWBACK')
		expect(result).toBeNull()
	})
})

describe('createDiscount', () => {
	it('calls create with correct data and createdById', async () => {
		const input = { name: 'Impuesto', type: 'IMPUESTO' as const, percentage: 12 }
		const created = { id: 1, ...input, status: 'ACTIVE', description: null, createdById: 5 }
		mockCreate.mockResolvedValue(created as never)
		const result = await createDiscount(input, 5)
		expect(result).toEqual(created)
		expect(mockCreate).toHaveBeenCalledWith({
			data: { ...input, description: null, createdById: 5 },
		})
	})
})

describe('findDiscountById', () => {
	it('calls findUnique with the given id', async () => {
		const row = { id: 7, name: 'Test', status: 'ACTIVE' }
		mockFindUnique.mockResolvedValue(row as never)
		const result = await findDiscountById(7)
		expect(result).toEqual(row)
		expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: 7 } })
	})

	it('returns null when not found', async () => {
		mockFindUnique.mockResolvedValue(null as never)
		const result = await findDiscountById(99)
		expect(result).toBeNull()
	})
})

describe('inactivateDiscount', () => {
	it('calls update with INACTIVE status and updatedById', async () => {
		const updated = { id: 3, status: 'INACTIVE', updatedById: 2 }
		mockUpdate.mockResolvedValue(updated as never)
		const result = await inactivateDiscount(3, 2)
		expect(result).toEqual(updated)
		expect(mockUpdate).toHaveBeenCalledWith({
			where: { id: 3 },
			data: { status: 'INACTIVE', updatedById: 2 },
		})
	})
})
