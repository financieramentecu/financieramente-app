import { describe, it, expect, vi, beforeEach } from 'vitest'
import { updateClient } from '@/features/negocios/actions/update-client'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth/nextauth'
import { UserRole } from '@/features/auth/lib/roles'
import { AuditAction, logAuditEvent } from '@/features/auth/lib/audit-logger'

vi.mock('@/lib/prisma', () => ({
	prisma: {
		client: {
			findUnique: vi.fn(),
			findFirst: vi.fn(),
			update: vi.fn(),
		},
		documentType: {
			findFirst: vi.fn(),
		},
	},
}))

vi.mock('@/lib/auth/nextauth', () => ({
	auth: vi.fn(),
}))

vi.mock('@/features/auth/lib/audit-logger', async (importOriginal) => {
	const actual =
		await importOriginal<typeof import('@/features/auth/lib/audit-logger')>()
	return {
		...actual,
		logAuditEvent: vi.fn().mockResolvedValue(undefined),
		getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
		getUserAgent: vi.fn().mockReturnValue('vitest'),
	}
})

vi.mock('next/headers', () => ({
	headers: vi.fn().mockResolvedValue(new Headers()),
}))

vi.mock('next/cache', () => ({
	revalidatePath: vi.fn(),
}))

const existingClient = {
	idClient: 10,
	name: 'Ana',
	lastName: 'Pérez',
	typeIdentity: 'CC',
	identityNumber: '1234567890',
	email: 'ana@example.com',
	phone: '3001234567',
	direcction: null,
	city: null,
	country: 'Colombia',
	status: true,
	createdAt: new Date(),
	updatedAt: new Date(),
}

describe('updateClient — COM-63 authorization', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(prisma.client.findUnique).mockResolvedValue(
			existingClient as never
		)
		vi.mocked(prisma.client.findFirst).mockResolvedValue(null)
		vi.mocked(prisma.client.update).mockResolvedValue({
			...existingClient,
			name: 'Ana María',
		} as never)
	})

	it('rejects CONSULTOR (read-only role)', async () => {
		vi.mocked(auth).mockResolvedValue({
			user: {
				id: '4',
				email: 'consultor@financieramentecu.com',
				role: UserRole.CONSULTOR,
			},
		} as never)

		const result = await updateClient({
			idClient: 10,
			name: 'Ana María',
			context: 'business-create',
		})

		expect(result.data).toBeNull()
		expect('error' in result && result.error).toBe('Sin permisos')
		expect(prisma.client.update).not.toHaveBeenCalled()
	})

	it('rejects unauthenticated callers', async () => {
		vi.mocked(auth).mockResolvedValue(null as never)

		const result = await updateClient({
			idClient: 10,
			name: 'Ana María',
			context: 'business-edit',
		})

		expect(result.data).toBeNull()
		expect('error' in result && result.error).toBe('No autorizado')
		expect(prisma.client.update).not.toHaveBeenCalled()
	})

	it('rejects non-privileged roles on business-edit context', async () => {
		vi.mocked(auth).mockResolvedValue({
			user: {
				id: '1',
				email: 'agente@financieramentecu.com',
				role: UserRole.AGENTE,
			},
		} as never)

		const result = await updateClient({
			idClient: 10,
			name: 'Ana María',
			email: 'ana@example.com',
			phone: '3001234567',
			lastName: 'Pérez',
			context: 'business-edit',
			businessId: 99,
		})

		expect(result.data).toBeNull()
		expect('error' in result && result.error).toBe(
			'No tienes permisos para editar la información del cliente'
		)
		expect(prisma.client.update).not.toHaveBeenCalled()
	})

	it('allows AGO to update client fields on business-edit', async () => {
		vi.mocked(auth).mockResolvedValue({
			user: {
				id: '2',
				email: 'ago@financieramentecu.com',
				role: UserRole.ASISTENTE_GERENCIA_OPERATIVA,
			},
		} as never)

		const result = await updateClient({
			idClient: 10,
			name: 'Ana María',
			lastName: 'Pérez',
			email: 'ana.maria@example.com',
			phone: '3009998877',
			identityNumber: '1234567890',
			context: 'business-edit',
			businessId: 99,
		})

		expect('error' in result).toBe(false)
		expect(result.data).toBeTruthy()
		expect(prisma.client.update).toHaveBeenCalled()
		expect(logAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				action: AuditAction.CLIENT_UPDATED,
				email: 'ago@financieramentecu.com',
			})
		)
	})

	it('allows authenticated agent to update name/email on business-create', async () => {
		vi.mocked(auth).mockResolvedValue({
			user: {
				id: '3',
				email: 'agente@financieramentecu.com',
				role: UserRole.AGENTE,
			},
		} as never)

		const result = await updateClient({
			idClient: 10,
			name: 'Ana María',
			email: 'ana@example.com',
			phone: '3001234567',
			context: 'business-create',
		})

		expect('error' in result).toBe(false)
		expect(prisma.client.update).toHaveBeenCalled()
	})

	it('rejects an agent changing typeIdentity on business-create', async () => {
		vi.mocked(auth).mockResolvedValue({
			user: {
				id: '3',
				email: 'agente@financieramentecu.com',
				role: UserRole.AGENTE,
			},
		} as never)

		const result = await updateClient({
			idClient: 10,
			typeIdentity: 'CE',
			context: 'business-create',
		})

		expect(result.data).toBeNull()
		expect('error' in result && result.error).toBe(
			'No tienes permisos para editar la información del cliente'
		)
		expect(prisma.client.update).not.toHaveBeenCalled()
	})

	it('rejects a privileged update that switches to a code outside the catalog', async () => {
		vi.mocked(auth).mockResolvedValue({
			user: {
				id: '2',
				email: 'ago@financieramentecu.com',
				role: UserRole.ASISTENTE_GERENCIA_OPERATIVA,
			},
		} as never)

		const result = await updateClient({
			idClient: 10,
			typeIdentity: 'CCX',
			context: 'business-edit',
			businessId: 99,
		})

		expect(result.data).toBeNull()
		expect('error' in result && result.error).toMatch(/no está disponible/)
		expect(prisma.client.update).not.toHaveBeenCalled()
	})

	it('saves other fields when a stored formatted identity stays the same', async () => {
		vi.mocked(auth).mockResolvedValue({
			user: {
				id: '2',
				email: 'ago@financieramentecu.com',
				role: UserRole.ASISTENTE_GERENCIA_OPERATIVA,
			},
		} as never)
		vi.mocked(prisma.client.findUnique).mockResolvedValue({
			...existingClient,
			identityNumber: '1.234.567',
		} as never)
		vi.mocked(prisma.documentType.findFirst).mockResolvedValue({
			idDocumentType: 1,
			name: 'Cédula de Ciudadanía',
			code: 'CC',
			dataType: 'NUMERIC',
			minLength: 6,
			maxLength: 10,
			status: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		} as never)
		vi.mocked(prisma.client.update).mockResolvedValue({
			...existingClient,
			identityNumber: '1.234.567',
			name: 'Ana María',
		} as never)

		const result = await updateClient({
			idClient: 10,
			name: 'Ana María',
			typeIdentity: 'CC',
			identityNumber: '1.234.567',
			context: 'business-edit',
			businessId: 99,
		})

		expect('error' in result).toBe(false)
		expect(prisma.documentType.findFirst).not.toHaveBeenCalled()
		expect(prisma.client.update).toHaveBeenCalled()
	})

	it('skips identity revalidation when an existing business edit does not change identityNumber or typeIdentity', async () => {
		vi.mocked(auth).mockResolvedValue({
			user: {
				id: '2',
				email: 'ago@financieramentecu.com',
				role: UserRole.ASISTENTE_GERENCIA_OPERATIVA,
			},
		} as never)
		vi.mocked(prisma.client.findUnique).mockResolvedValue({
			...existingClient,
			typeIdentity: 'PAS',
			identityNumber: '1.234.567',
		} as never)
		vi.mocked(prisma.documentType.findFirst).mockResolvedValue({
			idDocumentType: 2,
			name: 'Pasaporte',
			code: 'PAS',
			dataType: 'ALPHANUMERIC',
			minLength: 6,
			maxLength: 15,
			status: false,
			createdAt: new Date(),
			updatedAt: new Date(),
		} as never)
		vi.mocked(prisma.client.update).mockResolvedValue({
			...existingClient,
			typeIdentity: 'PAS',
			identityNumber: '1.234.567',
			name: 'Ana María',
		} as never)

		const result = await updateClient({
			idClient: 10,
			name: 'Ana María',
			context: 'business-edit',
			businessId: 99,
		})

		expect('error' in result).toBe(false)
		expect(prisma.documentType.findFirst).not.toHaveBeenCalled()
		expect(prisma.client.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: { name: 'Ana María' },
			})
		)
	})

	it('rejects a privileged update that replaces the identity with a formatted number', async () => {
		vi.mocked(auth).mockResolvedValue({
			user: {
				id: '2',
				email: 'ago@financieramentecu.com',
				role: UserRole.ASISTENTE_GERENCIA_OPERATIVA,
			},
		} as never)
		vi.mocked(prisma.client.findUnique).mockResolvedValue({
			...existingClient,
			identityNumber: '1234567',
		} as never)
		vi.mocked(prisma.documentType.findFirst).mockResolvedValue({
			idDocumentType: 1,
			name: 'Cédula de Ciudadanía',
			code: 'CC',
			dataType: 'NUMERIC',
			minLength: 6,
			maxLength: 10,
			status: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		} as never)

		const result = await updateClient({
			idClient: 10,
			typeIdentity: 'CC',
			identityNumber: '1.234.567',
			context: 'business-edit',
			businessId: 99,
		})

		expect(result.data).toBeNull()
		expect('error' in result && result.error).toMatch(/dígitos/)
		expect(prisma.client.update).not.toHaveBeenCalled()
	})

	it('rejects agent changing identityNumber even on business-create', async () => {
		vi.mocked(auth).mockResolvedValue({
			user: {
				id: '3',
				email: 'agente@financieramentecu.com',
				role: UserRole.AGENTE,
			},
		} as never)

		const result = await updateClient({
			idClient: 10,
			identityNumber: '9988776655',
			context: 'business-create',
		})

		expect(result.data).toBeNull()
		expect('error' in result && result.error).toBe(
			'No tienes permisos para editar la información del cliente'
		)
		expect(prisma.client.update).not.toHaveBeenCalled()
	})
})
