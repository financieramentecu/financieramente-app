import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { logAuditEvent } from '@/features/auth/lib/audit-logger'
import {
	createLeadFunnelColumn,
	updateLeadFunnelColumn,
	deleteLeadFunnelColumn,
} from '@/features/leads/services/lead-funnel-column.service'

vi.mock('@/lib/prisma', () => ({
	prisma: {
		leadFunnelColumn: {
			findFirst: vi.fn(),
			findUnique: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
		},
		lead: {
			count: vi.fn(),
		},
	},
}))

vi.mock('@/features/auth/lib/audit-logger', () => ({
	logAuditEvent: vi.fn(),
	AuditAction: {
		LEAD_FUNNEL_COLUMN_CREATED: 'LEAD_FUNNEL_COLUMN_CREATED',
		LEAD_FUNNEL_COLUMN_UPDATED: 'LEAD_FUNNEL_COLUMN_UPDATED',
	},
}))

const auditContext = { email: 'admin@example.com' }

describe('createLeadFunnelColumn', () => {
	beforeEach(() => vi.clearAllMocks())

	it('creates the column and logs LEAD_FUNNEL_COLUMN_CREATED', async () => {
		vi.mocked(prisma.leadFunnelColumn.findFirst).mockResolvedValue(null)
		vi.mocked(prisma.leadFunnelColumn.create).mockResolvedValue({
			idLeadFunnelColumn: 5,
			name: 'Ganado',
			externalStatusKey: 'won',
		} as never)

		const result = await createLeadFunnelColumn(
			{ name: 'Ganado', externalStatusKey: 'won', position: 1 },
			auditContext
		)

		expect('error' in result).toBe(false)
		expect(logAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({ action: 'LEAD_FUNNEL_COLUMN_CREATED' })
		)
	})

	it('rejects a duplicate externalStatusKey among active columns', async () => {
		vi.mocked(prisma.leadFunnelColumn.findFirst).mockResolvedValue({
			idLeadFunnelColumn: 1,
		} as never)

		const result = await createLeadFunnelColumn(
			{ name: 'Duplicado', externalStatusKey: 'won', position: 1 },
			auditContext
		)

		expect('error' in result && result.error).toBeTruthy()
		expect(prisma.leadFunnelColumn.create).not.toHaveBeenCalled()
		expect(prisma.leadFunnelColumn.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({ where: { externalStatusKey: 'WON', active: true } })
		)
	})

	it('allows reusing an externalStatusKey that only a soft-deleted (tombstoned) column ever had', async () => {
		// deleteLeadFunnelColumn tombstones the key on soft delete, so the
		// active-only lookup here finds nothing and creation succeeds.
		vi.mocked(prisma.leadFunnelColumn.findFirst).mockResolvedValue(null)
		vi.mocked(prisma.leadFunnelColumn.create).mockResolvedValue({
			idLeadFunnelColumn: 9,
			name: 'Ganado',
			externalStatusKey: 'WON',
		} as never)

		const result = await createLeadFunnelColumn(
			{ name: 'Ganado', externalStatusKey: 'won', position: 1 },
			auditContext
		)

		expect('error' in result).toBe(false)
	})
})

describe('updateLeadFunnelColumn', () => {
	beforeEach(() => vi.clearAllMocks())

	it('renames/reorders and logs LEAD_FUNNEL_COLUMN_UPDATED', async () => {
		vi.mocked(prisma.leadFunnelColumn.findFirst).mockResolvedValue(null)
		vi.mocked(prisma.leadFunnelColumn.update).mockResolvedValue({
			idLeadFunnelColumn: 5,
		} as never)

		const result = await updateLeadFunnelColumn(
			5,
			{ name: 'Nuevo nombre', position: 2 },
			auditContext
		)

		expect('error' in result).toBe(false)
		expect(logAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({ action: 'LEAD_FUNNEL_COLUMN_UPDATED' })
		)
	})

	it('rejects changing externalStatusKey to a different value', async () => {
		vi.mocked(prisma.leadFunnelColumn.findUnique).mockResolvedValue({
			idLeadFunnelColumn: 5,
			externalStatusKey: 'WON',
		} as never)

		const result = await updateLeadFunnelColumn(
			5,
			{ externalStatusKey: 'ganado' },
			auditContext
		)

		expect('error' in result && result.error).toBeTruthy()
		expect(prisma.leadFunnelColumn.update).not.toHaveBeenCalled()
	})

	it('allows resubmitting the same externalStatusKey as a harmless no-op', async () => {
		vi.mocked(prisma.leadFunnelColumn.findUnique).mockResolvedValue({
			idLeadFunnelColumn: 5,
			externalStatusKey: 'WON',
		} as never)
		vi.mocked(prisma.leadFunnelColumn.update).mockResolvedValue({
			idLeadFunnelColumn: 5,
		} as never)

		const result = await updateLeadFunnelColumn(
			5,
			{ name: 'Ganado', externalStatusKey: 'won' },
			auditContext
		)

		expect('error' in result).toBe(false)
		expect(prisma.leadFunnelColumn.update).toHaveBeenCalledWith(
			expect.objectContaining({ data: { name: 'Ganado' } })
		)
	})
})

describe('deleteLeadFunnelColumn', () => {
	beforeEach(() => vi.clearAllMocks())

	it('blocks deletion of the fallback column', async () => {
		vi.mocked(prisma.leadFunnelColumn.findUnique).mockResolvedValue({
			idLeadFunnelColumn: 1,
			isFallback: true,
		} as never)

		const result = await deleteLeadFunnelColumn(1)
		expect('error' in result && result.error).toBeTruthy()
	})

	it('blocks deletion when the column has active leads (409)', async () => {
		vi.mocked(prisma.leadFunnelColumn.findUnique).mockResolvedValue({
			idLeadFunnelColumn: 2,
			isFallback: false,
		} as never)
		vi.mocked(prisma.lead.count).mockResolvedValue(3)

		const result = await deleteLeadFunnelColumn(2)
		expect('error' in result && result.error).toBeTruthy()
		expect(prisma.leadFunnelColumn.update).not.toHaveBeenCalled()
	})

	it('soft-deletes when the column has zero active leads', async () => {
		vi.mocked(prisma.leadFunnelColumn.findUnique).mockResolvedValue({
			idLeadFunnelColumn: 3,
			isFallback: false,
		} as never)
		vi.mocked(prisma.lead.count).mockResolvedValue(0)
		vi.mocked(prisma.leadFunnelColumn.update).mockResolvedValue({} as never)

		const result = await deleteLeadFunnelColumn(3)
		expect('error' in result).toBe(false)
		expect(prisma.leadFunnelColumn.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { idLeadFunnelColumn: 3 },
				data: expect.objectContaining({ active: false }),
			})
		)
	})

	it('tombstones externalStatusKey on soft delete so the value can be reused by a new column', async () => {
		vi.mocked(prisma.leadFunnelColumn.findUnique).mockResolvedValue({
			idLeadFunnelColumn: 3,
			isFallback: false,
			externalStatusKey: 'WON',
		} as never)
		vi.mocked(prisma.lead.count).mockResolvedValue(0)
		vi.mocked(prisma.leadFunnelColumn.update).mockResolvedValue({} as never)

		await deleteLeadFunnelColumn(3)

		expect(prisma.leadFunnelColumn.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ externalStatusKey: 'WON__deleted_3' }),
			})
		)
	})
})
