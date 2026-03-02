import { describe, it, expect, vi, beforeEach } from 'vitest'
import { processBatchService } from '../services/process-batch.service'
import { prisma } from '@/lib/prisma'
import { FILE_TYPES } from '../lib/file-types'
import type {
	ProcessBatchRequest,
	ProcessedRecord,
} from '../types/load-file.types'
import { findBusinessByContract } from '../lib/business-matcher'

vi.mock('@/lib/prisma', () => ({
	prisma: {
		fileImport: {
			findFirst: vi.fn(),
			update: vi.fn().mockImplementation((args) => ({
				successRecord: args.data?.successRecord?.increment || 0,
				errorRecord: args.data?.errorRecord?.increment || 0,
				status: 'LOAD',
			})),
		},
		commissionConfiguration: {
			findFirst: vi.fn(),
		},
		settlementCommission: {
			create: vi.fn(),
			findFirst: vi.fn(),
			findMany: vi.fn(),
			update: vi.fn(),
		},
		fileImportError: {
			create: vi.fn(),
		},
		$transaction: vi.fn(async (callback) => await callback(prisma)),
	},
}))

vi.mock('../lib/business-matcher', () => ({
	findBusinessByContract: vi.fn(),
}))

vi.mock('@/features/auth/lib/audit-logger', () => ({
	logAuditEvent: vi.fn(),
	AuditAction: { IMPORT_ERROR: 'IMPORT_ERROR' },
}))

describe('processBatchService', () => {
	const mockAuditContext = {
		userId: 1,
		email: 'admin@test.com',
		ipAddress: '127.0.0.1',
		userAgent: 'test-agent',
		fileImportId: 100,
	}

	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(prisma.fileImport.findFirst).mockResolvedValue({
			idFileImport: 100,
		} as never)
		vi.mocked(prisma.commissionConfiguration.findFirst).mockResolvedValue({
			discountPercentage: 12,
			clawbackPercentage: 10,
		} as never)
	})

	describe('Poliza Scenarios', () => {
		const record: ProcessedRecord = {
			rowNumber: 2,
			isValid: true,
			errors: [],
			data: {
				'Contrato Largo': 'POL-001',
				BASE: 1000,
				'Valor Comisión': 100,
				'Plan de Compensación': 'Test Plan',
			},
		}
		const request: ProcessBatchRequest = {
			fileImportId: 100,
			records: [record],
			headers: [
				'Contrato Largo',
				'BASE',
				'Valor Comisión',
				'Plan de Compensación',
			],
			fileType: FILE_TYPES.POLIZA,
		}

		it('4.3 should create LAG record and increment noSincronizado when business not found', async () => {
			vi.mocked(findBusinessByContract).mockResolvedValue(null)

			const result = await processBatchService.processBatch(
				request,
				mockAuditContext
			)

			expect(prisma.settlementCommission.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({ status: 'LAG', isLag: true }),
				})
			)
			expect(result.summary.noSincronizado).toBe(1)
		})

		it('4.3 should update prior LAG to SYNCHRONIZED when recovering lag', async () => {
			vi.mocked(findBusinessByContract).mockResolvedValue({
				idBusiness: 50,
			} as never)
			vi.mocked(prisma.settlementCommission.findFirst).mockResolvedValue({
				idSettlementCommission: 500,
				status: 'LAG',
				isLag: true,
			} as never)

			const result = await processBatchService.processBatch(
				request,
				mockAuditContext
			)

			expect(prisma.settlementCommission.update).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { idSettlementCommission: 500 },
					data: expect.objectContaining({
						status: 'SYNCHRONIZED',
						isLag: false,
					}),
				})
			)
			expect(prisma.settlementCommission.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						status: 'SYNCHRONIZED',
						isLag: false,
						idBusiness: 50,
					}),
				})
			)
			expect(result.summary.sincronizado).toBe(2) // 1 generated + 1 recovered
		})

		it('4.4 should identify FRONT19 as origin CARTERA', async () => {
			const frontRecord = {
				...record,
				data: {
					...record.data,
					'Plan de Compensación': 'SOMETHING FRONT19 SOMETHING',
				},
			}
			vi.mocked(findBusinessByContract).mockResolvedValue({
				idBusiness: 50,
			} as never)
			vi.mocked(prisma.settlementCommission.findFirst).mockResolvedValue(null)

			await processBatchService.processBatch(
				{ ...request, records: [frontRecord] },
				mockAuditContext
			)

			expect(prisma.settlementCommission.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						status: 'SYNCHRONIZED',
						originCommission: 'CARTERA',
						isClawback: false,
					}),
				})
			)
		})

		it('4.4 should identify CLAW overrides', async () => {
			const clawRecord = {
				...record,
				data: { ...record.data, 'Plan de Compensación': 'TEST CLAW TEST' },
			}
			vi.mocked(findBusinessByContract).mockResolvedValue({
				idBusiness: 50,
			} as never)
			vi.mocked(prisma.settlementCommission.findFirst).mockResolvedValue(null)

			await processBatchService.processBatch(
				{ ...request, records: [clawRecord] },
				mockAuditContext
			)

			expect(prisma.settlementCommission.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						status: 'SYNCHRONIZED',
						isClawback: true,
					}),
				})
			)
		})
	})

	describe('Voluntaria Scenarios', () => {
		const record: ProcessedRecord = {
			rowNumber: 3,
			isValid: true,
			errors: [],
			data: {
				Cto: 'VOL-001',
				Base: 1000,
				Com: 100,
				'Tipo de Comision': 'TEST',
				Desde: new Date('2023-01-01'),
				Hasta: new Date('2023-01-31'),
			},
		}
		const request: ProcessBatchRequest = {
			fileImportId: 100,
			records: [record],
			headers: ['Cto', 'Base', 'Com', 'Tipo de Comision', 'Desde', 'Hasta'],
			fileType: FILE_TYPES.VOLUNTARIA,
		}

		it('4.1 should detect duplicate commission and save in FileImportError', async () => {
			vi.mocked(findBusinessByContract).mockResolvedValue({
				idBusiness: 60,
				createdAt: new Date('2023-01-15'),
			} as never)
			vi.mocked(prisma.settlementCommission.findMany).mockResolvedValue([
				{
					startDate: new Date('2023-01-01'),
					endDate: new Date('2023-01-31'),
				} as never,
			])

			const result = await processBatchService.processBatch(
				request,
				mockAuditContext
			)

			expect(prisma.settlementCommission.create).not.toHaveBeenCalled()
			expect(prisma.fileImportError.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({ reason: 'Duplicate commission' }),
				})
			)
			expect(result.summary.error).toBe(1)
		})

		it('4.2 should create LAG when business found but date outside range', async () => {
			// CreatedAt is in Feb, but record is Jan
			vi.mocked(findBusinessByContract).mockResolvedValue({
				idBusiness: 60,
				createdAt: new Date('2023-02-15'),
			} as never)
			vi.mocked(prisma.settlementCommission.findMany).mockResolvedValue([])

			const result = await processBatchService.processBatch(
				request,
				mockAuditContext
			)

			expect(prisma.settlementCommission.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						status: 'LAG',
						isLag: true,
						idBusiness: 60,
					}),
				})
			)
			expect(result.summary.rezagado).toBe(1)
		})
	})
})
