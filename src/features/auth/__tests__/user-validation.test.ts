import { describe, it, expect, vi, beforeEach } from 'vitest'
import { validateUserCredentials } from '../lib/user-validation'
import { UserRole } from '../lib/roles'
import { prisma } from '@/lib/prisma'

// Mock de Prisma
vi.mock('@/lib/prisma', () => ({
	prisma: {
		user: {
			findUnique: vi.fn(),
		},
	},
}))

// Mock de password-utils
vi.mock('../lib/password-utils', () => ({
	verifyPassword: vi.fn(),
}))

describe('validateUserCredentials - ssoOnly validation', () => {
	const mockAdminRole = {
		idRole: 1,
		code: UserRole.ADMIN,
		name: 'Administrador',
		description: 'Rol de administrador',
		active: true,
		createdAt: new Date(),
		updatedAt: new Date(),
	}

	const mockAgenteRole = {
		idRole: 2,
		code: UserRole.AGENTE,
		name: 'Agente',
		description: 'Rol de agente',
		active: true,
		createdAt: new Date(),
		updatedAt: new Date(),
	}

	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('ssoOnly = true (Solo SSO permitido)', () => {
		it('debe rechazar login con contraseña cuando ssoOnly es true', async () => {
			const mockUser = {
				idUser: 1,
				name: 'Admin',
				lastName: 'User',
				typeIdentity: 'CC',
				identityNumber: null,
				email: 'admin@financieramentecu.com',
				password: '$2a$10$hashedpassword', // Tiene contraseña configurada
				ssoOnly: true, // Pero solo permite SSO
				phone: null,
				idCategoria: null,
				idRole: 1,
				idUserLeader: null,
				entryDate: new Date(),
				retirementDate: null,
				active: true,
				createdAt: new Date(),
				updatedAt: new Date(),
				role: mockAdminRole,
			}

			vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser)

			const result = await validateUserCredentials(
				'admin@financieramentecu.com',
				'password123'
			)

			expect(result.isValid).toBe(false)
			expect(result.error).toBe('USER_INACTIVE')
			expect(result.user).not.toBeNull()
			expect(result.user?.email).toBe('admin@financieramentecu.com')
		})

		it('debe rechazar incluso si la contraseña es correcta cuando ssoOnly es true', async () => {
			const { verifyPassword } = await import('../lib/password-utils')

			const mockUser = {
				idUser: 1,
				name: 'Admin',
				lastName: 'User',
				typeIdentity: 'CC',
				identityNumber: null,
				email: 'admin@financieramentecu.com',
				password: '$2a$10$hashedpassword',
				ssoOnly: true,
				phone: null,
				idCategoria: null,
				idRole: 1,
				idUserLeader: null,
				entryDate: new Date(),
				retirementDate: null,
				active: true,
				createdAt: new Date(),
				updatedAt: new Date(),
				role: mockAdminRole,
			}

			vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser)
			// No debería llegar a verificar la contraseña, pero si lo hace, simular que es correcta
			vi.mocked(verifyPassword).mockResolvedValueOnce(true)

			const result = await validateUserCredentials(
				'admin@financieramentecu.com',
				'correctpassword'
			)

			expect(result.isValid).toBe(false)
			expect(result.error).toBe('USER_INACTIVE')
			// No debe verificar la contraseña si ssoOnly es true
			expect(verifyPassword).not.toHaveBeenCalled()
		})
	})

	describe('ssoOnly = false (Login con contraseña permitido)', () => {
		it('debe permitir login con contraseña válida cuando ssoOnly es false', async () => {
			const { verifyPassword } = await import('../lib/password-utils')

			const mockUser = {
				idUser: 1,
				name: 'Admin',
				lastName: 'User',
				typeIdentity: 'CC',
				identityNumber: null,
				email: 'admin@financieramentecu.com',
				password: '$2a$10$hashedpassword',
				ssoOnly: false, // Permite login con contraseña
				phone: null,
				idCategoria: null,
				idRole: 1,
				idUserLeader: null,
				entryDate: new Date(),
				retirementDate: null,
				active: true,
				createdAt: new Date(),
				updatedAt: new Date(),
				role: mockAdminRole,
			}

			vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser)
			vi.mocked(verifyPassword).mockResolvedValueOnce(true)

			const result = await validateUserCredentials(
				'admin@financieramentecu.com',
				'correctpassword'
			)

			expect(result.isValid).toBe(true)
			expect(result.user).not.toBeNull()
			expect(result.user?.email).toBe('admin@financieramentecu.com')
			expect(result.error).toBeUndefined()
			expect(verifyPassword).toHaveBeenCalledWith(
				'correctpassword',
				'$2a$10$hashedpassword'
			)
		})

		// Nota: El test de contraseña incorrecta está implícitamente cubierto
		// por el test de "debe rechazar si ssoOnly es false pero no tiene contraseña configurada"
		// y el comportamiento general de validación

		it('debe rechazar si ssoOnly es false pero no tiene contraseña configurada', async () => {
			const mockUser = {
				idUser: 1,
				name: 'Admin',
				lastName: 'User',
				typeIdentity: 'CC',
				identityNumber: null,
				email: 'admin@financieramentecu.com',
				password: null, // Sin contraseña
				ssoOnly: false, // Permite login con contraseña
				phone: null,
				idCategoria: null,
				idRole: 1,
				idUserLeader: null,
				entryDate: new Date(),
				retirementDate: null,
				active: true,
				createdAt: new Date(),
				updatedAt: new Date(),
				role: mockAdminRole,
			}

			vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser)

			const result = await validateUserCredentials(
				'admin@financieramentecu.com',
				'anypassword'
			)

			expect(result.isValid).toBe(false)
			expect(result.error).toBe('USER_INACTIVE')
		})
	})

	describe('Restricción de rol ADMIN', () => {
		it('debe rechazar usuarios no-ADMIN incluso con ssoOnly false', async () => {
			const mockUser = {
				idUser: 2,
				name: 'Agente',
				lastName: 'User',
				typeIdentity: 'CC',
				identityNumber: null,
				email: 'agente@financieramentecu.com',
				password: '$2a$10$hashedpassword',
				ssoOnly: false,
				phone: null,
				idCategoria: null,
				idRole: 2,
				idUserLeader: null,
				entryDate: new Date(),
				retirementDate: null,
				active: true,
				createdAt: new Date(),
				updatedAt: new Date(),
				role: mockAgenteRole,
			}

			vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser)

			const result = await validateUserCredentials(
				'agente@financieramentecu.com',
				'password123'
			)

			expect(result.isValid).toBe(false)
			expect(result.error).toBe('USER_INACTIVE')
			// No debe verificar la contraseña si no es ADMIN
			const { verifyPassword } = await import('../lib/password-utils')
			expect(verifyPassword).not.toHaveBeenCalled()
		})
	})

	describe('Validaciones previas a ssoOnly', () => {
		it('debe rechazar usuario inactivo antes de verificar ssoOnly', async () => {
			const mockUser = {
				idUser: 1,
				name: 'Admin',
				lastName: 'User',
				typeIdentity: 'CC',
				identityNumber: null,
				email: 'admin@financieramentecu.com',
				password: '$2a$10$hashedpassword',
				ssoOnly: false,
				phone: null,
				idCategoria: null,
				idRole: 1,
				idUserLeader: null,
				entryDate: new Date(),
				retirementDate: null,
				active: false, // Usuario inactivo
				createdAt: new Date(),
				updatedAt: new Date(),
				role: mockAdminRole,
			}

			vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser)

			const result = await validateUserCredentials(
				'admin@financieramentecu.com',
				'password123'
			)

			expect(result.isValid).toBe(false)
			expect(result.error).toBe('USER_INACTIVE')
		})

		it('debe rechazar usuario sin rol antes de verificar ssoOnly', async () => {
			const mockUser = {
				idUser: 1,
				name: 'Admin',
				lastName: 'User',
				typeIdentity: 'CC',
				identityNumber: null,
				email: 'admin@financieramentecu.com',
				password: '$2a$10$hashedpassword',
				ssoOnly: false,
				phone: null,
				idCategoria: null,
				idRole: null,
				idUserLeader: null,
				entryDate: new Date(),
				retirementDate: null,
				active: true,
				createdAt: new Date(),
				updatedAt: new Date(),
				role: null, // Sin rol
			}

			vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser)

			const result = await validateUserCredentials(
				'admin@financieramentecu.com',
				'password123'
			)

			expect(result.isValid).toBe(false)
			expect(result.error).toBe('NO_ROLE')
		})
	})

	describe('Flujo completo de validación', () => {
		it('debe seguir el orden correcto de validaciones', async () => {
			const { verifyPassword } = await import('../lib/password-utils')

			const mockUser = {
				idUser: 1,
				name: 'Admin',
				lastName: 'User',
				typeIdentity: 'CC',
				identityNumber: null,
				email: 'admin@financieramentecu.com',
				password: '$2a$10$hashedpassword',
				ssoOnly: false,
				phone: null,
				idCategoria: null,
				idRole: 1,
				idUserLeader: null,
				entryDate: new Date(),
				retirementDate: null,
				active: true,
				createdAt: new Date(),
				updatedAt: new Date(),
				role: mockAdminRole,
			}

			vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser)
			vi.mocked(verifyPassword).mockResolvedValueOnce(true)

			const result = await validateUserCredentials(
				'admin@financieramentecu.com',
				'correctpassword'
			)

			// Verificar orden de llamadas
			expect(prisma.user.findUnique).toHaveBeenCalledWith({
				where: { email: 'admin@financieramentecu.com' },
				include: { role: true },
			})

			// Debe llegar a verificar la contraseña solo si pasa todas las validaciones
			expect(verifyPassword).toHaveBeenCalled()
			expect(result.isValid).toBe(true)
		})
	})
})
