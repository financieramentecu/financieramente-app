import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuditAction, logAuditEvent } from '@/features/auth/lib/audit-logger'
import { prisma } from '@/lib/prisma'
import {
	createDocumentType,
	updateDocumentType,
	validateIdentityForExistingRecord,
	validateIdentityForNewRecord,
} from '@/features/document-types/services/document-type.service'

vi.mock('@/lib/prisma', () => ({
	prisma: {
		documentType: {
			findFirst: vi.fn(),
			findUnique: vi.fn(),
			findMany: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
		},
	},
}))

vi.mock('@/features/auth/lib/audit-logger', async (importOriginal) => {
	const actual =
		await importOriginal<typeof import('@/features/auth/lib/audit-logger')>()
	return {
		...actual,
		logAuditEvent: vi.fn().mockResolvedValue(undefined),
	}
})

const stored = {
	idDocumentType: 1,
	name: 'Cédula de Ciudadanía',
	code: 'CC',
	dataType: 'NUMERIC' as const,
	minLength: 6,
	maxLength: 10,
	status: true,
	createdAt: new Date('2026-01-01T00:00:00.000Z'),
	updatedAt: new Date('2026-01-01T00:00:00.000Z'),
}

describe('document type service', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('rejects a duplicated name without creating a row', async () => {
		vi.mocked(prisma.documentType.findFirst).mockResolvedValueOnce(stored)

		const result = await createDocumentType({
			name: 'cédula de ciudadanía',
			code: 'CC2',
			dataType: 'NUMERIC',
			minLength: 6,
			maxLength: 10,
			status: true,
		})

		expect('error' in result && result.error).toMatch(/nombre/)
		expect(prisma.documentType.create).not.toHaveBeenCalled()
	})

	it('rejects a duplicated code', async () => {
		vi.mocked(prisma.documentType.findFirst)
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce(stored)

		const result = await createDocumentType({
			name: 'Otra cédula',
			code: 'cc',
			dataType: 'NUMERIC',
			minLength: 6,
			maxLength: 10,
			status: true,
		})

		expect('error' in result && result.error).toMatch(/abreviatura/)
		expect(prisma.documentType.create).not.toHaveBeenCalled()
	})

	it('stores the code in uppercase and audits the creation', async () => {
		vi.mocked(prisma.documentType.findFirst).mockResolvedValue(null)
		vi.mocked(prisma.documentType.create).mockResolvedValue({
			...stored,
			code: 'PD',
			name: 'Pasaporte diplomático',
		})

		const result = await createDocumentType(
			{
				name: ' Pasaporte diplomático ',
				code: 'pd',
				dataType: 'ALPHANUMERIC',
				minLength: 6,
				maxLength: 12,
				status: true,
			},
			{ userId: 4, email: 'admin@test.com' }
		)

		expect(prisma.documentType.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				code: 'PD',
				name: 'Pasaporte diplomático',
				status: true,
			}),
		})
		expect('documentType' in result && result.documentType.code).toBe('PD')
		expect(logAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				action: AuditAction.DOCUMENT_TYPE_CREATED,
				userId: 4,
			})
		)
	})

	it('deactivates with a status update and keeps the row', async () => {
		vi.mocked(prisma.documentType.findUnique).mockResolvedValue(stored)
		vi.mocked(prisma.documentType.findFirst).mockResolvedValue(null)
		vi.mocked(prisma.documentType.update).mockResolvedValue({
			...stored,
			status: false,
		})

		const result = await updateDocumentType(1, { status: false })

		expect(prisma.documentType.update).toHaveBeenCalledWith({
			where: { idDocumentType: 1 },
			data: expect.objectContaining({ status: false }),
		})
		expect('documentType' in result && result.documentType.status).toBe(false)
		expect(logAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				action: AuditAction.DOCUMENT_TYPE_DEACTIVATED,
			})
		)
	})

	it('blocks a new record that uses an inactive type', async () => {
		vi.mocked(prisma.documentType.findFirst).mockResolvedValue({
			...stored,
			status: false,
		})

		await expect(validateIdentityForNewRecord('CC', '1234567890')).resolves.toMatch(
			/no está disponible/
		)
	})

	it('keeps validating an existing record whose type was deactivated', async () => {
		vi.mocked(prisma.documentType.findFirst).mockResolvedValue({
			...stored,
			status: false,
		})

		await expect(
			validateIdentityForExistingRecord({
				previousCode: 'CC',
				nextCode: 'CC',
				identityNumber: '1234567890',
			})
		).resolves.toBeNull()
	})

	it('rejects switching an existing record to another inactive type', async () => {
		vi.mocked(prisma.documentType.findFirst).mockResolvedValue({
			...stored,
			code: 'PAS',
			status: false,
			dataType: 'ALPHANUMERIC',
			minLength: 6,
			maxLength: 15,
		})

		await expect(
			validateIdentityForExistingRecord({
				previousCode: 'CC',
				nextCode: 'PAS',
				identityNumber: 'AB123456',
			})
		).resolves.toMatch(/no está disponible/)
	})
})
