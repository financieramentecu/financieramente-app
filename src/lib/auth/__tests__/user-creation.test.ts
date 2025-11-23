import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createUserAutomatically, type CreateUserParams } from '../user-creation'
import { UserRole } from '../roles'
import { AuditAction, logAuditEvent } from '../audit-logger'
import { prisma } from '@/lib/prisma'

// Mock de Prisma
vi.mock('@/lib/prisma', () => ({
	prisma: {
		user: {
			findUnique: vi.fn(),
			create: vi.fn(),
		},
		role: {
			findUnique: vi.fn(),
		},
	},
}))

// Mock de audit-logger
vi.mock('../audit-logger', () => ({
	logAuditEvent: vi.fn(),
	AuditAction: {
		USER_CREATED: 'USER_CREATED',
	},
}))

describe('createUserAutomatically', () => {
	const mockParams: CreateUserParams = {
		email: 'test@financieramentecu.com',
		name: 'John Doe',
		ipAddress: '192.168.1.1',
		userAgent: 'Mozilla/5.0',
	}

	const mockDefaultRole = {
		idRole: 1,
		code: UserRole.DEFAULT,
		name: 'Default',
		description: 'Rol por defecto',
		active: true,
		createdAt: new Date(),
		updatedAt: new Date(),
	}

	const mockCreatedUser = {
		idUser: 1,
		name: 'John',
		lastName: 'Doe',
		email: 'test@financieramentecu.com',
		idRole: 1,
		active: false,
		entryDate: new Date(),
		createdAt: new Date(),
		updatedAt: new Date(),
	}

	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('Creación exitosa', () => {
		it('debe crear un usuario nuevo con estado Inactivo y rol Default', async () => {
			// Usuario no existe
			vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null)
			// Rol Default existe
			vi.mocked(prisma.role.findUnique).mockResolvedValueOnce(mockDefaultRole)
			// Crear usuario exitosamente
			vi.mocked(prisma.user.create).mockResolvedValueOnce(mockCreatedUser)

			const result = await createUserAutomatically(mockParams)

			expect(result.success).toBe(true)
			expect(result.userId).toBe(1)
			expect(result.error).toBeUndefined()

			// Verificar que se buscó el usuario por email
			expect(prisma.user.findUnique).toHaveBeenCalledWith({
				where: { email: mockParams.email },
				include: { role: true },
			})

			// Verificar que se buscó el rol Default
			expect(prisma.role.findUnique).toHaveBeenCalledWith({
				where: { code: UserRole.DEFAULT },
			})

			// Verificar que se creó el usuario con los datos correctos
			expect(prisma.user.create).toHaveBeenCalledWith({
				data: {
					name: 'John',
					lastName: 'Doe',
					email: mockParams.email,
					typeIdentity: 'CC',
					idRole: mockDefaultRole.idRole,
					active: false,
					entryDate: expect.any(Date),
				},
			})

			// Verificar que se registró el evento de auditoría
			expect(logAuditEvent).toHaveBeenCalledWith({
				userId: mockCreatedUser.idUser,
				roleId: mockDefaultRole.idRole,
				action: AuditAction.USER_CREATED,
				email: mockParams.email,
				ipAddress: mockParams.ipAddress,
				userAgent: mockParams.userAgent,
				details: 'Usuario creado automáticamente con rol Default y estado Inactivo',
			})
		})

		it('debe extraer correctamente nombre y apellido del nombre completo', async () => {
			vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null)
			vi.mocked(prisma.role.findUnique).mockResolvedValueOnce(mockDefaultRole)
			vi.mocked(prisma.user.create).mockResolvedValueOnce(mockCreatedUser)

			const paramsWithFullName: CreateUserParams = {
				...mockParams,
				name: 'María José García López',
			}

			await createUserAutomatically(paramsWithFullName)

			expect(prisma.user.create).toHaveBeenCalledWith({
				data: expect.objectContaining({
					name: 'María',
					lastName: 'José García López',
				}),
			})
		})

		it('debe manejar nombres con un solo nombre', async () => {
			vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null)
			vi.mocked(prisma.role.findUnique).mockResolvedValueOnce(mockDefaultRole)
			vi.mocked(prisma.user.create).mockResolvedValueOnce(mockCreatedUser)

			const paramsWithSingleName: CreateUserParams = {
				...mockParams,
				name: 'Madonna',
			}

			await createUserAutomatically(paramsWithSingleName)

			expect(prisma.user.create).toHaveBeenCalledWith({
				data: expect.objectContaining({
					name: 'Madonna',
					lastName: null,
				}),
			})
		})
	})

	describe('Usuario duplicado', () => {
		it('debe retornar el usuario existente si ya existe en la base de datos', async () => {
			const existingUser = {
				...mockCreatedUser,
				idUser: 5,
				role: mockDefaultRole,
			}

			vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(existingUser)

			const result = await createUserAutomatically(mockParams)

			expect(result.success).toBe(true)
			expect(result.userId).toBe(5)
			expect(result.error).toBeUndefined()

			// No debe intentar crear el usuario
			expect(prisma.user.create).not.toHaveBeenCalled()
			// No debe registrar evento de auditoría para usuarios existentes
			expect(logAuditEvent).not.toHaveBeenCalled()
		})

		it('debe manejar condición de carrera cuando el usuario se crea entre validación y creación', async () => {
			const prismaError = {
				code: 'P2002',
				message: 'Unique constraint failed on the fields: (`email`)',
			}

			// Primera búsqueda: usuario no existe
			vi.mocked(prisma.user.findUnique)
				.mockResolvedValueOnce(null)
				// Segunda búsqueda después del error: usuario existe
				.mockResolvedValueOnce({
					...mockCreatedUser,
					idUser: 10,
					role: mockDefaultRole,
				})

			vi.mocked(prisma.role.findUnique).mockResolvedValueOnce(mockDefaultRole)
			vi.mocked(prisma.user.create).mockRejectedValueOnce(prismaError)

			const result = await createUserAutomatically(mockParams)

			expect(result.success).toBe(true)
			expect(result.userId).toBe(10)
			expect(result.error).toBeUndefined()

			// Debe haber intentado crear y luego buscar el usuario existente
			expect(prisma.user.create).toHaveBeenCalledTimes(1)
			expect(prisma.user.findUnique).toHaveBeenCalledTimes(2)
			// No debe registrar evento de auditoría para usuarios creados en condición de carrera
			expect(logAuditEvent).not.toHaveBeenCalled()
		})

		it('debe manejar error de constraint único con mensaje de texto', async () => {
			const prismaError = {
				code: 'P2002',
				message: 'Unique constraint',
			}

			vi.mocked(prisma.user.findUnique)
				.mockResolvedValueOnce(null)
				.mockResolvedValueOnce({
					...mockCreatedUser,
					idUser: 15,
					role: mockDefaultRole,
				})

			vi.mocked(prisma.role.findUnique).mockResolvedValueOnce(mockDefaultRole)
			vi.mocked(prisma.user.create).mockRejectedValueOnce(prismaError)

			const result = await createUserAutomatically(mockParams)

			expect(result.success).toBe(true)
			expect(result.userId).toBe(15)
			// No debe registrar evento de auditoría para usuarios creados en condición de carrera
			expect(logAuditEvent).not.toHaveBeenCalled()
		})
	})

	describe('Errores de validación', () => {
		it('debe retornar error si el rol Default no existe', async () => {
			vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null)
			vi.mocked(prisma.role.findUnique).mockResolvedValueOnce(null)

			const result = await createUserAutomatically(mockParams)

			expect(result.success).toBe(false)
			expect(result.error).toBe(
				'Rol Default no encontrado. Ejecuta el seed de roles.'
			)
			expect(result.userId).toBeUndefined()

			// No debe intentar crear el usuario
			expect(prisma.user.create).not.toHaveBeenCalled()
		})

		it('debe manejar errores de Prisma al crear usuario', async () => {
			const prismaError = new Error('Database connection failed')

			vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null)
			vi.mocked(prisma.role.findUnique).mockResolvedValueOnce(mockDefaultRole)
			vi.mocked(prisma.user.create).mockRejectedValueOnce(prismaError)

			const result = await createUserAutomatically(mockParams)

			expect(result.success).toBe(false)
			expect(result.error).toBe('Database connection failed')
			expect(result.userId).toBeUndefined()
		})

		it('debe manejar errores desconocidos', async () => {
			vi.mocked(prisma.user.findUnique).mockRejectedValueOnce('Unknown error')

			const result = await createUserAutomatically(mockParams)

			expect(result.success).toBe(false)
			expect(result.error).toBe('Error desconocido al crear usuario')
			expect(result.userId).toBeUndefined()
		})
	})

	describe('Parámetros opcionales', () => {
		it('debe funcionar sin ipAddress y userAgent', async () => {
			const paramsWithoutOptional: CreateUserParams = {
				email: 'test@financieramentecu.com',
				name: 'John Doe',
			}

			vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null)
			vi.mocked(prisma.role.findUnique).mockResolvedValueOnce(mockDefaultRole)
			vi.mocked(prisma.user.create).mockResolvedValueOnce(mockCreatedUser)

			const result = await createUserAutomatically(paramsWithoutOptional)

			expect(result.success).toBe(true)
			expect(result.userId).toBe(1)
		})

		it('debe manejar image null', async () => {
			const paramsWithNullImage: CreateUserParams = {
				...mockParams,
				image: null,
			}

			vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null)
			vi.mocked(prisma.role.findUnique).mockResolvedValueOnce(mockDefaultRole)
			vi.mocked(prisma.user.create).mockResolvedValueOnce(mockCreatedUser)

			const result = await createUserAutomatically(paramsWithNullImage)

			expect(result.success).toBe(true)
		})
	})

	describe('Registro de auditoría', () => {
		it('debe registrar evento de auditoría solo cuando se crea un nuevo usuario', async () => {
			vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null)
			vi.mocked(prisma.role.findUnique).mockResolvedValueOnce(mockDefaultRole)
			vi.mocked(prisma.user.create).mockResolvedValueOnce(mockCreatedUser)

			await createUserAutomatically(mockParams)

			expect(logAuditEvent).toHaveBeenCalledTimes(1)
			expect(logAuditEvent).toHaveBeenCalledWith({
				userId: mockCreatedUser.idUser,
				roleId: mockDefaultRole.idRole,
				action: AuditAction.USER_CREATED,
				email: mockParams.email,
				ipAddress: mockParams.ipAddress,
				userAgent: mockParams.userAgent,
				details: 'Usuario creado automáticamente con rol Default y estado Inactivo',
			})
		})

		it('debe registrar evento de auditoría sin ipAddress y userAgent si no se proporcionan', async () => {
			const paramsWithoutOptional: CreateUserParams = {
				email: 'test@financieramentecu.com',
				name: 'John Doe',
			}

			vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null)
			vi.mocked(prisma.role.findUnique).mockResolvedValueOnce(mockDefaultRole)
			vi.mocked(prisma.user.create).mockResolvedValueOnce(mockCreatedUser)

			await createUserAutomatically(paramsWithoutOptional)

			expect(logAuditEvent).toHaveBeenCalledWith({
				userId: mockCreatedUser.idUser,
				roleId: mockDefaultRole.idRole,
				action: AuditAction.USER_CREATED,
				email: paramsWithoutOptional.email,
				ipAddress: undefined,
				userAgent: undefined,
				details: 'Usuario creado automáticamente con rol Default y estado Inactivo',
			})
		})
	})
})

