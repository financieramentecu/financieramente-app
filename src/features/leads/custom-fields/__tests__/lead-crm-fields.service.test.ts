import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { AuditAction, logAuditEvent } from '@/features/auth/lib/audit-logger'
import { listLeadCustomFields } from '@/features/leads/custom-fields/lead-custom-field.service'
import { getLeadCrmFields, updateLeadCrmFields } from '@/features/leads/custom-fields/lead-crm-fields.service'

vi.mock('@/lib/prisma', () => ({
	prisma: { lead: { findUnique: vi.fn(), update: vi.fn() } },
}))
vi.mock('@/features/auth/lib/audit-logger', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/features/auth/lib/audit-logger')>()),
	logAuditEvent: vi.fn(),
}))
vi.mock('@/features/leads/custom-fields/lead-custom-field.service', () => ({ listLeadCustomFields: vi.fn() }))

const ctx = { userId: 7, email: 'a@x.co' }
const defs = [{ idLeadCustomField: 1, key: 'company', label: 'Empresa', type: 'TEXT' as const, options: [], position: 0 }]

describe('lead CRM fields', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(listLeadCustomFields).mockResolvedValue(defs)
	})

	it('reads value, probability and visible custom values', async () => {
		vi.mocked(prisma.lead.findUnique).mockResolvedValue({
			estimatedValue: new Prisma.Decimal('1500000.5'),
			probability: 40,
			customFieldValues: { company: 'ACME', legacy: 'x' },
		} as never)
		await expect(getLeadCrmFields(10)).resolves.toEqual({
			estimatedValue: '1500000.5',
			probability: 40,
			customFieldValues: { company: 'ACME' },
		})
	})

	it('rejects invalid custom values before writing', async () => {
		vi.mocked(prisma.lead.findUnique).mockResolvedValue({ customFieldValues: {} } as never)
		await expect(updateLeadCrmFields(10, { customFields: { nope: 'x' } }, ctx)).resolves.toEqual({
			ok: false,
			error: 'Campo desconocido: nope',
		})
		expect(prisma.lead.update).not.toHaveBeenCalled()
	})

	it('writes only the CRM-owned columns sent, merges custom values and audits the changed keys', async () => {
		vi.mocked(prisma.lead.findUnique).mockResolvedValue({ customFieldValues: { company: 'Old', legacy: 'x' } } as never)
		vi.mocked(prisma.lead.update).mockResolvedValue({
			estimatedValue: new Prisma.Decimal('2000000'),
			probability: null,
			customFieldValues: { company: 'ACME', legacy: 'x' },
		} as never)
		const result = await updateLeadCrmFields(10, { estimatedValue: '2000000', probability: null, customFields: { company: 'ACME' } }, ctx)
		const call = vi.mocked(prisma.lead.update).mock.calls[0][0]
		expect(call.where).toEqual({ idLead: 10 })
		expect(Object.keys(call.data).sort()).toEqual(['customFieldValues', 'estimatedValue', 'probability'])
		expect(String(call.data.estimatedValue)).toBe('2000000')
		expect(call.data.probability).toBeNull()
		expect(call.data.customFieldValues).toEqual({ company: 'ACME', legacy: 'x' })
		expect(result).toEqual({
			ok: true,
			fields: { estimatedValue: '2000000', probability: null, customFieldValues: { company: 'ACME' } },
		})
		expect(logAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				action: AuditAction.LEAD_CRM_FIELDS_UPDATED,
				details: 'Lead 10: CRM fields updated (estimatedValue, probability, custom.company)',
			})
		)
	})

	it('does not read the stored custom values when none are sent', async () => {
		vi.mocked(prisma.lead.update).mockResolvedValue({ estimatedValue: null, probability: 10, customFieldValues: {} } as never)
		await updateLeadCrmFields(10, { probability: 10 }, ctx)
		expect(listLeadCustomFields).toHaveBeenCalledTimes(1)
		expect(prisma.lead.findUnique).not.toHaveBeenCalled()
		expect(Object.keys(vi.mocked(prisma.lead.update).mock.calls[0][0].data)).toEqual(['probability'])
	})
})
