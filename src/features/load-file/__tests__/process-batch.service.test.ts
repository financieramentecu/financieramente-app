import { describe, it, expect, vi, beforeEach } from 'vitest'
import { processBatchService } from '../services/process-batch.service'
import { prisma } from '@/lib/prisma'
import { FILE_TYPES } from '../lib/file-types'
import type {
	ProcessBatchRequest,
	ProcessedRecord,
} from '../types/load-file.types'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
	prisma: {
		fileImport: {
			findFirst: vi.fn(),
			update: vi.fn(),
		},
		commissionConfiguration: {
			findFirst: vi.fn(),
		},
		settlementCommission: {
			create: vi.fn(),
			findFirst: vi.fn(),
			update: vi.fn(),
		},
		business: {
			findFirst: vi.fn(),
		},
	},
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
	})

	describe('Validation & Authorization', () => {
		it('should throw an error if FileImport does not exist or does not belong to user', async () => {
			vi.mocked(prisma.fileImport.findFirst).mockResolvedValue(null)

			const dummyRecord: ProcessedRecord = {
				rowNumber: 2,
				isValid: true,
				errors: [],
				data: {},
			}

			const request: ProcessBatchRequest = {
				fileImportId: 999,
				records: [dummyRecord],
				headers: [],
				fileType: FILE_TYPES.POLIZA,
			}

			await expect(
				processBatchService.processBatch(request, mockAuditContext)
			).rejects.toThrow('FileImport no encontrado o no autorizado')
		})
	})

	describe('Core Lag/Sync Logic - Scenario 1: No Business Found', () => {
		it('should create a LAG record and increment noSincronizadoCount when business does not exist', async () => {
			// Mock FileImport found
			vi.mocked(prisma.fileImport.findFirst).mockResolvedValue({
				idFileImport: 100,
			} as any)
			// Mock no business found
			vi.mocked(prisma.business.findFirst).mockResolvedValue(null)

			const record: ProcessedRecord = {
				rowNumber: 2,
				isValid: true,
				errors: [],
				data: {
					'Contrato Largo': 'NON_EXISTENT_001',
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

			const result = await processBatchService.processBatch(
				request,
				mockAuditContext
			)

			expect(prisma.settlementCommission.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						status: 'LAG',
						isLag: true,
					}),
				})
			)
			expect(result.summary.noSincronizado).toBe(1)
			expect(result.summary.sincronizado).toBe(0)
		})
	})

	describe('Core Lag/Sync Logic - Scenario 2: Existing Lag Recovery', () => {
		it('should update the existing LAG, create a new SINCRONIZADO, and increment both sincronizado and rezagado counters', async () => {
			vi.mocked(prisma.fileImport.findFirst).mockResolvedValue({
				idFileImport: 100,
			} as any)
			// Mock business exists
			vi.mocked(prisma.business.findFirst).mockResolvedValue({
				idBusiness: 50,
				createdAt: new Date(),
			} as any)
			// Mock an existing lag record exists
			vi.mocked(prisma.settlementCommission.findFirst).mockResolvedValue({
				idSettlementCommission: 500,
				status: 'LAG',
			} as any)

			const record: ProcessedRecord = {
				rowNumber: 2,
				isValid: true,
				errors: [],
				data: {
					'Contrato Largo': 'VALID_CONTRACT',
					BASE: 1000,
					'Valor Comisión': 100,
				},
			}

			const request: ProcessBatchRequest = {
				fileImportId: 100,
				records: [record],
				headers: ['Contrato Largo', 'BASE', 'Valor Comisión'],
				fileType: FILE_TYPES.POLIZA,
			}

			const result = await processBatchService.processBatch(
				request,
				mockAuditContext
			)

			// Should update the old record
			expect(prisma.settlementCommission.update).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { idSettlementCommission: 500 },
					data: expect.objectContaining({
						status: 'SINCRONIZADO',
						isLag: false,
					}),
				})
			)

			// Should create the new record
			expect(prisma.settlementCommission.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						status: 'SINCRONIZADO',
						isLag: false,
						idBusiness: 50,
					}),
				})
			)

			// Recovered lags count for both Sincronizado AND Rezagado UI counters based on original logic
			expect(result.summary.sincronizado).toBe(1)
			expect(result.summary.rezagado).toBe(1)
		})
	})
})
