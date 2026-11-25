import { beforeEach, expect, it, vi } from 'vitest'
import { auth } from '@/auth'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { requireLeadCaptureAdmin } from '../lead-capture-admin'
import {
	validateLeadCapture,
	LeadCaptureValidationError,
} from '../lead-capture.service'
import { leadCaptureSchema } from '../lead-capture.schema'
import type { Prisma } from '@prisma/client'
vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/prisma', () => ({ prisma: {} }))
vi.mock('@/features/negocios/services/user.service', () => ({
	getCurrentUserByEmail: vi.fn(),
}))
vi.mock('@/lib/auth/require-crm-actor', () => ({
	crmErrorResponse: (error: string, status: number) =>
		Response.json({ data: null, error }, { status }),
}))
beforeEach(() => vi.clearAllMocks())
it('only permits a current administrator to manage the capture catalogue', async () => {
	vi.mocked(auth).mockResolvedValue({
		user: { email: 'actor@example.com' },
	} as never)
	vi.mocked(getCurrentUserByEmail).mockResolvedValue({
		role: { code: 'ASISTENTE_GERENCIA_OPERATIVA' },
	} as never)
	expect((await requireLeadCaptureAdmin()).ok).toBe(false)
	vi.mocked(getCurrentUserByEmail).mockResolvedValue({
		role: { code: 'ADMIN' },
	} as never)
	expect((await requireLeadCaptureAdmin()).ok).toBe(true)
})
it('validates capture ordering and trimmed names independently of origin', () => {
	expect(leadCaptureSchema.safeParse({ name: 'Plan', level: -1 }).success).toBe(
		false
	)
	expect(leadCaptureSchema.parse({ name: ' Plan ', level: 2 })).toEqual({
		name: 'Plan',
		level: 2,
		status: true,
	})
})
it('retains assigned inactive captures while rejecting a newly selected inactive capture', async () => {
	const findFirst = vi.fn().mockResolvedValue(null)
	const db = { leadCapture: { findFirst } } as unknown as Pick<
		Prisma.TransactionClient,
		'leadCapture'
	>
	await validateLeadCapture(db, 2, 2)
	expect(findFirst).not.toHaveBeenCalled()
	await expect(validateLeadCapture(db, 2)).rejects.toBeInstanceOf(
		LeadCaptureValidationError
	)
})
