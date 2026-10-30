import { describe, it, expect, vi, beforeEach } from 'vitest'
import { processBatchService } from '../services/process-batch.service'
import { prisma } from '@/lib/prisma'
import { FILE_TYPES } from '../lib/file-types'
import type {
	ProcessBatchRequest,
	ProcessedRecord,
} from '../types/load-file.types'
import { findBusinessByContract } from '../lib/business-matcher'
import { logAuditEvent } from '@/features/auth/lib/audit-logger'

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
		commissionDiscount: { findMany: vi.fn() },
		settlementCommission: {
			create: vi.fn(),
			findFirst: vi.fn(),
			findMany: vi.fn(),
			update: vi.fn(),
		},
		fileImportError: {
			create: vi.fn(),
			updateMany: vi.fn().mockResolvedValue({ count: 0 }),
		},
		$transaction: vi.fn(async (callback) => await callback(prisma)),
	},
}))

vi.mock('../lib/business-matcher', () => ({
	findBusinessByContract: vi.fn(),
}))

vi.mock('@/features/auth/lib/audit-logger', () => ({
	logAuditEvent: vi.fn(),
	AuditAction: {
		IMPORT_ERROR: 'IMPORT_ERROR',
		SETTLEMENT_EXCLUDED: 'SETTLEMENT_EXCLUDED',
	},
}))

const auditContext = {
	userId: 1,
	email: 'admin@test.com',
	ipAddress: '127.0.0.1',
	userAgent: 'test-agent',
	fileImportId: 100,
}

const PARTNER_BUSINESS = {
	idBusiness: 70,
	createdAt: new Date('2023-01-15'),
	isDistributionExcluded: true,
}
const AGENT_BUSINESS = {
	idBusiness: 60,
	createdAt: new Date('2023-01-15'),
	isDistributionExcluded: false,
}

const polizaRecord = (contract: string, row = 2): ProcessedRecord => ({
	rowNumber: row,
	isValid: true,
	errors: [],
	data: {
		'Contrato Largo': contract,
		BASE: 1000,
		'Valor Comisión': 100,
		'Plan de Compensación': 'Test Plan',
	},
})
const polizaRequest = (...contracts: string[]): ProcessBatchRequest => ({
	fileImportId: 100,
	records: contracts.map((c, i) => polizaRecord(c, i + 2)),
	headers: ['Contrato Largo', 'BASE', 'Valor Comisión', 'Plan de Compensación'],
	fileType: FILE_TYPES.POLIZA,
})

const volRecord = (
	contract: string,
	from = '2023-01-01',
	to = '2023-01-31',
	row = 3
): ProcessedRecord => ({
	rowNumber: row,
	isValid: true,
	errors: [],
	data: {
		Cto: contract,
		Base: 1000,
		Com: 100,
		'Tipo de Comision': 'TEST',
		Desde: new Date(from),
		Hasta: new Date(to),
	},
})
const volRequest = (records: ProcessedRecord[]): ProcessBatchRequest => ({
	fileImportId: 100,
	records,
	headers: ['Cto', 'Base', 'Com', 'Tipo de Comision', 'Desde', 'Hasta'],
	fileType: FILE_TYPES.VOLUNTARIA,
})

const createdStatuses = () =>
	vi
		.mocked(prisma.settlementCommission.create)
		.mock.calls.map(
			([args]) => (args as { data: { status: string } }).data.status
		)

const firstFileImportUpdate = () =>
	vi.mocked(prisma.fileImport.update).mock.calls[0][0] as {
		data: Record<string, unknown>
	}

beforeEach(() => {
	vi.clearAllMocks()
	vi.mocked(prisma.fileImport.findFirst).mockResolvedValue({
		idFileImport: 100,
	} as never)
	vi.mocked(prisma.commissionDiscount.findMany).mockResolvedValue([
		{ type: 'IMPUESTO', percentage: { toNumber: () => 12 } },
		{ type: 'CLAWBACK', percentage: { toNumber: () => 10 } },
	] as never)
	vi.mocked(prisma.settlementCommission.findFirst).mockResolvedValue(null)
	vi.mocked(prisma.settlementCommission.findMany).mockResolvedValue([])
})

describe('Poliza processor - partner business (PL-01)', () => {
	it('persists EXCLUDED with idBusiness set, never SYNCHRONIZED', async () => {
		vi.mocked(findBusinessByContract).mockResolvedValue(PARTNER_BUSINESS)

		const { summary } = await processBatchService.processBatch(
			polizaRequest('POL-1'),
			auditContext
		)

		expect(prisma.settlementCommission.create).toHaveBeenCalledTimes(1)
		const data = (
			vi.mocked(prisma.settlementCommission.create).mock.calls[0][0] as {
				data: Record<string, unknown>
			}
		).data
		expect(data).toMatchObject({
			status: 'EXCLUDED',
			idBusiness: 70,
			isLag: false,
			commissionType: FILE_TYPES.POLIZA,
		})
		expect(data.syncDate).toBeUndefined()
		expect(summary).toMatchObject({
			excluido: 1,
			sincronizado: 0,
			rezagado: 0,
			error: 0,
		})
	})

	it('counts the row as successfully processed but not as sincronizado', async () => {
		vi.mocked(findBusinessByContract).mockResolvedValue(PARTNER_BUSINESS)

		await processBatchService.processBatch(polizaRequest('POL-1'), auditContext)

		const { data } = firstFileImportUpdate()
		expect(data.successRecord).toEqual({ increment: 1 })
		expect(data.sincronizadoRecord).toEqual({ increment: 0 })
		expect(data.errorRecord).toEqual({ increment: 0 })
		expect(data.totalRecord).toEqual({ increment: 1 })
	})

	it('a partner-only file keeps the import in LOAD (not ERROR)', async () => {
		vi.mocked(findBusinessByContract).mockResolvedValue(PARTNER_BUSINESS)

		await processBatchService.processBatch(
			polizaRequest('POL-1', 'POL-2'),
			auditContext
		)

		const statusUpdate = vi
			.mocked(prisma.fileImport.update)
			.mock.calls.map(([a]) => (a as { data: { status?: string } }).data.status)
			.filter(Boolean)
		expect(statusUpdate).toEqual(['LOAD'])
	})

	it('a mixed file stores one EXCLUDED and one SYNCHRONIZED row', async () => {
		vi.mocked(findBusinessByContract)
			.mockResolvedValueOnce(PARTNER_BUSINESS)
			.mockResolvedValueOnce(AGENT_BUSINESS)

		const { summary } = await processBatchService.processBatch(
			polizaRequest('POL-P', 'POL-A'),
			auditContext
		)

		expect(createdStatuses()).toEqual(['EXCLUDED', 'SYNCHRONIZED'])
		expect(summary).toMatchObject({ total: 2, sincronizado: 1, excluido: 1 })
		const { data } = firstFileImportUpdate()
		expect(data.successRecord).toEqual({ increment: 2 })
		expect(data.sincronizadoRecord).toEqual({ increment: 1 })
	})

	it('a prior LAG of the same contract becomes EXCLUDED, not SYNCHRONIZED, and the lag counter drops', async () => {
		vi.mocked(findBusinessByContract).mockResolvedValue(PARTNER_BUSINESS)
		vi.mocked(prisma.settlementCommission.findFirst).mockResolvedValue({
			idSettlementCommission: 9,
		} as never)

		const { summary } = await processBatchService.processBatch(
			polizaRequest('POL-1'),
			auditContext
		)

		expect(prisma.settlementCommission.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { idSettlementCommission: 9 },
				data: expect.objectContaining({ status: 'EXCLUDED', isLag: false }),
			})
		)
		expect(createdStatuses()).toEqual(['EXCLUDED'])
		const { data } = firstFileImportUpdate()
		expect(data.rezagadoRecord).toEqual({ decrement: 1 })
		expect(summary.excluido).toBe(1)
	})

	it('non-partner business keeps SYNCHRONIZED (regression)', async () => {
		vi.mocked(findBusinessByContract).mockResolvedValue(AGENT_BUSINESS)

		await processBatchService.processBatch(polizaRequest('POL-1'), auditContext)

		expect(createdStatuses()).toEqual(['SYNCHRONIZED'])
	})

	it('business without the flag (legacy shape) keeps SYNCHRONIZED', async () => {
		vi.mocked(findBusinessByContract).mockResolvedValue({
			idBusiness: 5,
		} as never)

		await processBatchService.processBatch(polizaRequest('POL-1'), auditContext)

		expect(createdStatuses()).toEqual(['SYNCHRONIZED'])
	})

	it('unknown contract still becomes LAG even when other rows are excluded', async () => {
		vi.mocked(findBusinessByContract)
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce(PARTNER_BUSINESS)

		const { summary } = await processBatchService.processBatch(
			polizaRequest('POL-X', 'POL-P'),
			auditContext
		)

		expect(createdStatuses()).toEqual(['LAG', 'EXCLUDED'])
		expect(summary).toMatchObject({ noSincronizado: 1, excluido: 1 })
	})
})

describe('Voluntaria processor - partner business (PL-01)', () => {
	it('persists EXCLUDED when the business creation date is inside the period', async () => {
		vi.mocked(findBusinessByContract).mockResolvedValue(PARTNER_BUSINESS)

		const { summary } = await processBatchService.processBatch(
			volRequest([volRecord('VOL-1')]),
			auditContext
		)

		expect(createdStatuses()).toEqual(['EXCLUDED'])
		const data = (
			vi.mocked(prisma.settlementCommission.create).mock.calls[0][0] as {
				data: Record<string, unknown>
			}
		).data
		expect(data).toMatchObject({ idBusiness: 70, isLag: false })
		expect(summary).toMatchObject({ excluido: 1, sincronizado: 0, rezagado: 0 })
	})

	it('persists EXCLUDED (never LAG) when the business creation date is outside the period', async () => {
		vi.mocked(findBusinessByContract).mockResolvedValue(PARTNER_BUSINESS)

		const { summary } = await processBatchService.processBatch(
			volRequest([volRecord('VOL-1', '2024-05-01', '2024-05-31')]),
			auditContext
		)

		expect(createdStatuses()).toEqual(['EXCLUDED'])
		expect(summary).toMatchObject({ excluido: 1, rezagado: 0 })
	})

	it('an existing LAG of the contract becomes EXCLUDED and the lag counter drops', async () => {
		vi.mocked(findBusinessByContract).mockResolvedValue(PARTNER_BUSINESS)
		vi.mocked(prisma.settlementCommission.findMany).mockResolvedValue([
			{
				idSettlementCommission: 4,
				isLag: true,
				status: 'LAG',
				startDate: new Date('2022-12-01'),
				endDate: new Date('2022-12-31'),
			},
		] as never)

		await processBatchService.processBatch(
			volRequest([volRecord('VOL-1')]),
			auditContext
		)

		expect(prisma.settlementCommission.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { idSettlementCommission: 4 },
				data: expect.objectContaining({ status: 'EXCLUDED', isLag: false }),
			})
		)
		expect(createdStatuses()).toEqual(['EXCLUDED'])
		expect(firstFileImportUpdate().data.rezagadoRecord).toEqual({
			decrement: 1,
		})
	})

	it('an exact duplicate period is still reported as an error (no second EXCLUDED row)', async () => {
		vi.mocked(findBusinessByContract).mockResolvedValue(PARTNER_BUSINESS)
		vi.mocked(prisma.settlementCommission.findMany).mockResolvedValue([
			{
				idSettlementCommission: 4,
				isLag: false,
				status: 'EXCLUDED',
				startDate: new Date('2023-01-01'),
				endDate: new Date('2023-01-31'),
			},
		] as never)

		const { summary } = await processBatchService.processBatch(
			volRequest([volRecord('VOL-1')]),
			auditContext
		)

		expect(prisma.settlementCommission.create).not.toHaveBeenCalled()
		expect(summary).toMatchObject({ error: 1, excluido: 0 })
	})

	it('mixed file: partner EXCLUDED, agent SYNCHRONIZED', async () => {
		vi.mocked(findBusinessByContract)
			.mockResolvedValueOnce(PARTNER_BUSINESS)
			.mockResolvedValueOnce(AGENT_BUSINESS)

		const { summary } = await processBatchService.processBatch(
			volRequest([
				volRecord('VOL-P', undefined, undefined, 3),
				volRecord('VOL-A', undefined, undefined, 4),
			]),
			auditContext
		)

		expect(createdStatuses()).toEqual(['EXCLUDED', 'SYNCHRONIZED'])
		expect(summary).toMatchObject({ total: 2, sincronizado: 1, excluido: 1 })
	})

	it('non-partner business keeps SYNCHRONIZED (regression)', async () => {
		vi.mocked(findBusinessByContract).mockResolvedValue(AGENT_BUSINESS)

		await processBatchService.processBatch(
			volRequest([volRecord('VOL-1')]),
			auditContext
		)

		expect(createdStatuses()).toEqual(['SYNCHRONIZED'])
	})
})

describe('audit of excluded rows during load (9.4)', () => {
	const settlementExcludedEvents = () =>
		vi
			.mocked(logAuditEvent)
			.mock.calls.map(([a]) => a)
			.filter((a) => a.action === 'SETTLEMENT_EXCLUDED')

	it('logs ONE aggregated SETTLEMENT_EXCLUDED event with the excluded count and the request context', async () => {
		vi.mocked(findBusinessByContract).mockResolvedValue(PARTNER_BUSINESS)

		await processBatchService.processBatch(
			polizaRequest('POL-1', 'POL-2', 'POL-3'),
			auditContext
		)

		const events = settlementExcludedEvents()
		expect(events).toHaveLength(1)
		expect(events[0]).toMatchObject({
			userId: 1,
			email: 'admin@test.com',
			ipAddress: '127.0.0.1',
			userAgent: 'test-agent',
		})
		expect(JSON.parse(events[0].details as string)).toEqual({
			entityType: 'FILE_IMPORT',
			fileImportId: 100,
			source: 'LOAD',
			excludedCount: 3,
		})
	})

	it('logs nothing when the batch contains no excluded rows', async () => {
		vi.mocked(findBusinessByContract).mockResolvedValue(AGENT_BUSINESS)

		await processBatchService.processBatch(polizaRequest('POL-A'), auditContext)

		expect(settlementExcludedEvents()).toHaveLength(0)
	})
})
