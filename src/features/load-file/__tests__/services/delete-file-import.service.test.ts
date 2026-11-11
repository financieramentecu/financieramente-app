import { describe, it, expect, vi, beforeEach } from 'vitest'
import { deleteFileImport } from '@/features/load-file/services/delete-file-import.service'

const mockFindFirst = vi.fn()
const mockTransaction = vi.fn()
const mockFileImportFindUnique = vi.fn()
const mockFileImportUpdateMany = vi.fn()
const mockSettlementFindMany = vi.fn()
const mockSettlementUpdateMany = vi.fn()
const mockDistributionFindMany = vi.fn()
const mockDistributionUpdateMany = vi.fn()
const mockClawbackUpdateMany = vi.fn()

// Models intentionally expose NO deleteMany/delete: any physical delete throws.
const txClient = {
	fileImport: {
		findUnique: (...args: unknown[]) => mockFileImportFindUnique(...args),
		updateMany: (...args: unknown[]) => mockFileImportUpdateMany(...args),
	},
	settlementCommission: {
		findMany: (...args: unknown[]) => mockSettlementFindMany(...args),
		updateMany: (...args: unknown[]) => mockSettlementUpdateMany(...args),
	},
	comissionDistribution: {
		findMany: (...args: unknown[]) => mockDistributionFindMany(...args),
		updateMany: (...args: unknown[]) => mockDistributionUpdateMany(...args),
	},
	clawback: {
		updateMany: (...args: unknown[]) => mockClawbackUpdateMany(...args),
	},
}

vi.mock('@/lib/prisma', () => ({
	prisma: {
		fileImport: {
			findFirst: (...args: unknown[]) => mockFindFirst(...args),
		},
		$transaction: (callback: (tx: unknown) => Promise<unknown>) =>
			mockTransaction(callback),
	},
}))

describe('deleteFileImport (soft delete)', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockTransaction.mockImplementation(async (callback) => callback(txClient))
		mockFileImportFindUnique.mockResolvedValue({ idFileImport: 1 })
		mockFileImportUpdateMany.mockResolvedValue({ count: 1 })
		mockSettlementFindMany.mockResolvedValue([])
		mockSettlementUpdateMany.mockResolvedValue({ count: 0 })
		mockDistributionFindMany.mockResolvedValue([])
		mockDistributionUpdateMany.mockResolvedValue({ count: 0 })
		mockClawbackUpdateMany.mockResolvedValue({ count: 0 })
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

	it('looks the file up excluding already deleted imports', async () => {
		mockFindFirst.mockResolvedValue(null)

		await deleteFileImport(5, 7)

		expect(mockFindFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					idFileImport: 5,
					idUser: 7,
					status: { not: 'DELETED' },
				},
			})
		)
	})

	it.each(['PRE-SETTLED', 'SETTLED'])(
		'returns INVALID_STATUS when status is %s',
		async (status) => {
			mockFindFirst.mockResolvedValue({ idFileImport: 1, status })

			const result = await deleteFileImport(1, 1)

			expect(result).toEqual({
				ok: false,
				code: 'INVALID_STATUS',
				message: expect.stringContaining('LOAD o ERROR'),
			})
			expect(mockTransaction).not.toHaveBeenCalled()
		}
	)

	it.each(['LOAD', 'ERROR'])(
		'soft deletes the file import and its settlements when status is %s',
		async (status) => {
			mockFindFirst.mockResolvedValue({ idFileImport: 1, status })

			const result = await deleteFileImport(1, 1)

			expect(result).toEqual({ ok: true })
			expect(mockFileImportUpdateMany).toHaveBeenCalledWith({
				where: { idFileImport: 1 },
				data: { status: 'DELETED' },
			})
			expect(mockSettlementUpdateMany).toHaveBeenCalledWith({
				where: { idFileImport: 1 },
				data: { status: 'DELETED' },
			})
		}
	)

	it('deactivates distributions and marks clawbacks as deleted without removing rows', async () => {
		mockFindFirst.mockResolvedValue({ idFileImport: 1, status: 'LOAD' })
		mockSettlementFindMany.mockResolvedValue([
			{ idSettlementCommission: 10 },
			{ idSettlementCommission: 11 },
		])
		mockDistributionFindMany.mockResolvedValue([
			{ idComissionDistribution: 100 },
			{ idComissionDistribution: 101 },
		])

		const result = await deleteFileImport(1, 1)

		expect(result).toEqual({ ok: true })
		expect(mockDistributionUpdateMany).toHaveBeenCalledWith({
			where: { idSettlementCommission: { in: [10, 11] } },
			data: { isActive: false },
		})
		expect(mockClawbackUpdateMany).toHaveBeenCalledWith({
			where: { idComissionDistribution: { in: [100, 101] } },
			data: { state: 'DELETED' },
		})
	})

	it('throws NOT_FOUND when the file disappears inside the transaction', async () => {
		mockFindFirst.mockResolvedValue({ idFileImport: 1, status: 'LOAD' })
		mockFileImportFindUnique.mockResolvedValue(null)

		await expect(deleteFileImport(1, 1)).rejects.toThrow('NOT_FOUND')
		expect(mockFileImportUpdateMany).not.toHaveBeenCalled()
	})
})
