import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import { AuditAction, logAuditEvent } from '@/features/auth/lib/audit-logger'
import {
	createLeadCustomField,
	deactivateLeadCustomField,
	listLeadCustomFields,
	updateLeadCustomField,
} from '@/features/leads/custom-fields/lead-custom-field.service'

vi.mock('@/lib/prisma', () => ({
	prisma: {
		leadCustomField: { findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
	},
}))
vi.mock('@/features/auth/lib/audit-logger', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/features/auth/lib/audit-logger')>()),
	logAuditEvent: vi.fn(),
}))

const ctx = { userId: 7, email: 'a@x.co' }
const record = { idLeadCustomField: 4, key: 'product', label: 'Producto', type: 'SELECT', options: ['A', 'B'], position: 0 }

describe('lead custom field definitions', () => {
	beforeEach(() => vi.clearAllMocks())

	it('lists active definitions by position and sanitizes options', async () => {
		vi.mocked(prisma.leadCustomField.findMany).mockResolvedValue([record, { ...record, idLeadCustomField: 5, options: 'bad' }] as never)
		const fields = await listLeadCustomFields()
		expect(prisma.leadCustomField.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ where: { active: true }, orderBy: [{ position: 'asc' }, { idLeadCustomField: 'asc' }] })
		)
		expect(fields[0]).toEqual(record)
		expect(fields[1].options).toEqual([])
	})

	it('creates a definition with a unique key and audits it', async () => {
		vi.mocked(prisma.leadCustomField.findUnique).mockResolvedValue(null)
		vi.mocked(prisma.leadCustomField.create).mockResolvedValue(record as never)
		await expect(
			createLeadCustomField({ key: 'product', label: 'Producto', type: 'SELECT', options: ['A', 'B'], position: 0 }, ctx)
		).resolves.toEqual({ ok: true, field: record })
		expect(prisma.leadCustomField.create).toHaveBeenCalledWith(
			expect.objectContaining({ data: expect.objectContaining({ key: 'product', createdBy: 7 }) })
		)
		expect(logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: AuditAction.LEAD_CUSTOM_FIELD_CREATED }))
	})

	it('refuses a key already used, even by an inactive field', async () => {
		vi.mocked(prisma.leadCustomField.findUnique).mockResolvedValue({ idLeadCustomField: 1 } as never)
		await expect(
			createLeadCustomField({ key: 'product', label: 'P', type: 'TEXT', options: [], position: 0 }, ctx)
		).resolves.toEqual({ ok: false, reason: 'DUPLICATE_KEY' })
	})

	it('updates label, options and position; refuses options on a non-list field', async () => {
		vi.mocked(prisma.leadCustomField.findFirst).mockResolvedValue({ idLeadCustomField: 4, type: 'SELECT' } as never)
		vi.mocked(prisma.leadCustomField.update).mockResolvedValue({ ...record, label: 'Prod' } as never)
		await expect(updateLeadCustomField(4, { label: 'Prod', options: ['A'] }, ctx)).resolves.toMatchObject({ ok: true })
		expect(prisma.leadCustomField.update).toHaveBeenCalledWith(
			expect.objectContaining({ where: { idLeadCustomField: 4 }, data: { label: 'Prod', options: ['A'] } })
		)
		expect(logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: AuditAction.LEAD_CUSTOM_FIELD_UPDATED }))

		vi.mocked(prisma.leadCustomField.findFirst).mockResolvedValue({ idLeadCustomField: 1, type: 'TEXT' } as never)
		await expect(updateLeadCustomField(1, { options: ['A'] }, ctx)).resolves.toEqual({ ok: false, reason: 'OPTIONS_NOT_ALLOWED' })

		vi.mocked(prisma.leadCustomField.findFirst).mockResolvedValue(null)
		await expect(updateLeadCustomField(9, { label: 'x' }, ctx)).resolves.toEqual({ ok: false, reason: 'NOT_FOUND' })
	})

	it('deactivates a definition', async () => {
		vi.mocked(prisma.leadCustomField.findFirst).mockResolvedValue({ idLeadCustomField: 4, type: 'SELECT' } as never)
		await expect(deactivateLeadCustomField(4, ctx)).resolves.toEqual({ ok: true })
		expect(prisma.leadCustomField.update).toHaveBeenCalledWith({ where: { idLeadCustomField: 4 }, data: { active: false } })
		expect(logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: AuditAction.LEAD_CUSTOM_FIELD_DEACTIVATED }))
	})
})
