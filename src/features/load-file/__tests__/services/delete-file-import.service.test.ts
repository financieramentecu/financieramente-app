import { describe, it, expect, vi, beforeEach } from 'vitest'
import { deleteFileImport } from '@/features/load-file/services/delete-file-import.service'

const mockFindFirst = vi.fn()
const mockTransaction = vi.fn()
const mockFindUnique = vi.fn()
const mockSettlementFindMany = vi.fn()
const mockDistributionFindMany = vi.fn()
const mockClawbackDeleteMany = vi.fn()
const mockDistributionDeleteMany = vi.fn()
const mockSettlementDeleteMany = vi.fn()
const mockFileImportErrorDeleteMany = vi.fn()
const mockFileImportDeleteMany = vi.fn()

vi.mock('@/lib/prisma', () => ({
	prisma: {
		fileImport: {
			findFirst: (...args: unknown[]) => mockFindFirst(...args),
			findUnique: (...args: unknown[]) => mockFindUnique(...args),
			deleteMany: (...args: unknown[]) => mockFileImportDeleteMany(...args),
		},
		settlementCommission: {
			findMany: (...args: unknown[]) => mockSettlementFindMany(...args),
			deleteMany: (...args: unknown[]) => mockSettlementDeleteMany(...args),
		},
		comissionDistribution: {
			findMany: (...args: unknown[]) => mockDistributionFindMany(...args),
			deleteMany: (...args: unknown[]) => mockDistributionDeleteMany(...args),
		},
		clawback: {
			deleteMany: (...args: unknown[]) => mockClawbackDeleteMany(...args),
		},
		fileImportError: {
			deleteMany: (...args: unknown[]) => mockFileImportErrorDeleteMany(...args),
		},
		$transaction: (callback: (tx: unknown) => Promise<unknown>) =>
			mockTransaction(callback),
	},
}))

async function getMockTx() {
	let tx: Record<string, unknown> = {}
	vi.mocked(mockTransaction).mockImplementation(async (callback) => {
		tx = {
			fileImport: {
				findUnique: vi.fn().mockResolvedValue({ idFileImport: 1 }),
				deleteMany: mockFileImportDeleteMany,
			},
			settlementCommission: {
				findMany: mockSettlementFindMany,
				deleteMany: mockSettlementDeleteMany,
			},
			comissionDistribution: {
				findMany: mockDistributionFindMany,
				deleteMany: mockDistributionDeleteMany,
			},
			clawback: { deleteMany: mockClawbackDeleteMany },
			fileImportError: { deleteMany: mockFileImportErrorDeleteMany },
		}
		return callback(tx)
	})
	return tx
}

describe('deleteFileImport', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockSettlementFindMany.mockResolvedValue([])
		mockDistributionFindMany.mockResolvedValue([])
		mockClawbackDeleteMany.mockResolvedValue({ count: 0 })
		mockDistributionDeleteMany.mockResolvedValue({ count: 0 })
		mockSettlementDeleteMany.mockResolvedValue({ count: 0 })
		mockFileImportErrorDeleteMany.mockResolvedValue({ count: 0 })
		mockFileImportDeleteMany.mockResolvedValue({ count: 1 })
	})

	it('returns NOT_FOUND when file import does not exist or does not belong to user', async () => {
		mockFindFirst.mockResolvedValue(null)

		const result = await deleteFileImport(999, 1)

		expect(result).toEqual({
			ok: false,
			code: 'NOT_FOUND',
			message: 'FileImport no encontrado o no autorizado',
		})
		expect(mockTransaction).not.toHaveBeenCalled()
	})

	it('returns INVALID_STATUS when status is PRE-SETTLED', async () => {
		mockFindFirst.mockResolvedValue({
			idFileImport: 1,
			status: 'PRE-SETTLED',
		})

		const result = await deleteFileImport(1, 1)

		expect(result).toEqual({
			ok: false,
			code: 'INVALID_STATUS',
			message: expect.stringContaining('LOAD o ERROR'),
		})
		expect(mockTransaction).not.toHaveBeenCalled()
	})

	it('returns INVALID_STATUS when status is SETTLED', async () => {
		mockFindFirst.mockResolvedValue({
			idFileImport: 1,
			status: 'SETTLED',
		})

		const result = await deleteFileImport(1, 1)

		expect(result).toEqual({
			ok: false,
			code: 'INVALID_STATUS',
			message: expect.stringContaining('LOAD o ERROR'),
		})
		expect(mockTransaction).not.toHaveBeenCalled()
	})

	it('returns success when status is LOAD and runs transaction', async () => {
		mockFindFirst.mockResolvedValue({
			idFileImport: 1,
			status: 'LOAD',
		})
		await getMockTx()

		const result = await deleteFileImport(1, 1)

		expect(result).toEqual({ ok: true })
		expect(mockTransaction).toHaveBeenCalled()
		expect(mockFileImportErrorDeleteMany).toHaveBeenCalled()
		expect(mockFileImportDeleteMany).toHaveBeenCalled()
	})

	it('returns success when status is ERROR and runs transaction', async () => {
		mockFindFirst.mockResolvedValue({
			idFileImport: 1,
			status: 'ERROR',
		})
		await getMockTx()

		const result = await deleteFileImport(1, 1)

		expect(result).toEqual({ ok: true })
		expect(mockTransaction).toHaveBeenCalled()
		expect(mockFileImportErrorDeleteMany).toHaveBeenCalled()
		expect(mockFileImportDeleteMany).toHaveBeenCalled()
	})
})
