import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
	getActiveAdminUsers,
	generateNotificationHTML,
	generateNotificationPlainText,
	sendNewUserNotificationToAdmins,
	type AdminUser,
	type NewUserNotificationParams,
} from '../admin-notifications'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/features/email/lib/email-service'

// Mock de Prisma
vi.mock('@/lib/prisma', () => ({
	prisma: {
		user: {
			findMany: vi.fn(),
		},
	},
}))

// Mock de email-service
vi.mock('@/features/email/lib/email-service', () => ({
	sendEmail: vi.fn(),
	sendTemplatedEmail: vi.fn(),
}))

describe('admin-notifications', () => {
	const originalEnv = process.env

	beforeEach(() => {
		vi.clearAllMocks()
		process.env = { ...originalEnv }
	})

	afterEach(() => {
		process.env = originalEnv
	})

	describe('getActiveAdminUsers', () => {
		it('debe retornar administradores activos', async () => {
			const mockAdmins: AdminUser[] = [
				{
					idUser: 1,
					email: 'admin1@example.com',
					name: 'Admin',
					lastName: 'One',
				},
				{
					idUser: 2,
					email: 'admin2@example.com',
					name: 'Admin',
					lastName: 'Two',
				},
			]

			vi.mocked(prisma.user.findMany).mockResolvedValue(
				mockAdmins as unknown as Awaited<
					ReturnType<typeof prisma.user.findMany>
				>
			)

			const result = await getActiveAdminUsers()

			expect(result).toEqual(mockAdmins)
			expect(prisma.user.findMany).toHaveBeenCalledWith({
				where: {
					active: true,
					role: {
						code: 'ADMIN',
					},
				},
				select: {
					idUser: true,
					email: true,
					name: true,
					lastName: true,
				},
			})
		})

		it('debe retornar array vacío si no hay administradores', async () => {
			vi.mocked(prisma.user.findMany).mockResolvedValue([])

			const result = await getActiveAdminUsers()

			expect(result).toEqual([])
		})

		it('debe manejar errores de Prisma y retornar array vacío', async () => {
			vi.mocked(prisma.user.findMany).mockRejectedValue(
				new Error('Database error')
			)

			const consoleErrorSpy = vi
				.spyOn(console, 'error')
				.mockImplementation(() => {})

			const result = await getActiveAdminUsers()

			expect(result).toEqual([])
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				'Error obteniendo administradores activos:',
				expect.any(Error)
			)

			consoleErrorSpy.mockRestore()
		})
	})

	describe('generateNotificationHTML', () => {
		const params: NewUserNotificationParams & {
			baseUrl: string
			adminName: string
		} = {
			userId: 123,
			userName: 'Juan Pérez',
			userEmail: 'juan@example.com',
			baseUrl: 'https://example.com',
			adminName: 'Admin Test',
		}

		it('debe generar HTML válido con DOCTYPE', () => {
			const html = generateNotificationHTML(params)

			expect(html).toContain('<!DOCTYPE html>')
			expect(html).toContain('<html>')
			expect(html).toContain('</html>')
		})

		it('debe incluir información del usuario', () => {
			const html = generateNotificationHTML(params)

			expect(html).toContain('Juan Pérez')
			expect(html).toContain('juan@example.com')
		})

		it('debe incluir link correcto a dashboard/admin/users', () => {
			const html = generateNotificationHTML(params)

			expect(html).toContain('/dashboard/admin/users/123')
			expect(html).toContain('https://example.com/dashboard/admin/users/123')
		})

		it('debe incluir colores de marca', () => {
			const html = generateNotificationHTML(params)

			expect(html).toContain('#00505C')
			expect(html).toContain('#83D874')
		})

		it('debe incluir fecha formateada en español', () => {
			const html = generateNotificationHTML(params)

			// Verificar que contiene algún formato de fecha en español (ej: "24 de noviembre de 2025")
			expect(html).toMatch(
				/\d{1,2}\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+\d{4}/i
			)
		})

		it('debe incluir título y estructura correcta', () => {
			const html = generateNotificationHTML(params)

			expect(html).toContain('Nuevo Usuario Requiere Activación')
			expect(html).toContain('Sistema Financieramente')
			expect(html).toContain('Activar Usuario')
			expect(html).toContain('Inactivo')
			expect(html).toContain('Pendiente')
		})

		it('debe incluir saludo personalizado con nombre del administrador', () => {
			const html = generateNotificationHTML(params)

			expect(html).toContain('Hola Admin Test,')
		})

		it('debe incluir logo de Financieramente', () => {
			const html = generateNotificationHTML(params)

			expect(html).toContain('/logos/logo-verde.svg')
			expect(html).toContain('<img')
			expect(html).toContain('alt="Financieramente"')
		})

		it('debe incluir footer con copyright', () => {
			const html = generateNotificationHTML(params)
			const currentYear = new Date().getFullYear()

			expect(html).toContain('Financieramente')
			expect(html).toContain(currentYear.toString())
		})
	})

	describe('generateNotificationPlainText', () => {
		const params: NewUserNotificationParams & {
			baseUrl: string
			adminName: string
		} = {
			userId: 123,
			userName: 'Juan Pérez',
			userEmail: 'juan@example.com',
			baseUrl: 'https://example.com',
			adminName: 'Admin Test',
		}

		it('debe incluir toda la información del usuario', () => {
			const text = generateNotificationPlainText(params)

			expect(text).toContain('Juan Pérez')
			expect(text).toContain('juan@example.com')
			expect(text).toContain('Inactivo')
			expect(text).toContain('Pendiente')
		})

		it('debe incluir link directo', () => {
			const text = generateNotificationPlainText(params)

			expect(text).toContain('https://example.com/dashboard/admin/users/123')
		})

		it('debe incluir título y mensaje principal', () => {
			const text = generateNotificationPlainText(params)

			expect(text).toContain('Nuevo Usuario Requiere Activación')
			expect(text).toContain('actives su cuenta')
		})

		it('debe incluir fecha formateada', () => {
			const text = generateNotificationPlainText(params)

			// Verificar que contiene algún formato de fecha en español (ej: "24 de noviembre de 2025")
			expect(text).toMatch(
				/\d{1,2}\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+\d{4}/i
			)
		})

		it('debe incluir saludo personalizado con nombre del administrador', () => {
			const text = generateNotificationPlainText(params)

			expect(text).toContain('Hola Admin Test,')
		})
	})

	describe('sendNewUserNotificationToAdmins', () => {
		const params: NewUserNotificationParams = {
			userId: 123,
			userName: 'Juan Pérez',
			userEmail: 'juan@example.com',
		}

		const mockAdmins: AdminUser[] = [
			{
				idUser: 1,
				email: 'admin1@example.com',
				name: 'Admin',
				lastName: 'One',
			},
			{
				idUser: 2,
				email: 'admin2@example.com',
				name: 'Admin',
				lastName: 'Two',
			},
		]

		beforeEach(() => {
			vi.mocked(prisma.user.findMany).mockResolvedValue(
				mockAdmins as unknown as Awaited<
					ReturnType<typeof prisma.user.findMany>
				>
			)
		})

		it('debe obtener administradores activos', async () => {
			vi.mocked(sendEmail).mockResolvedValue({ success: true })

			process.env.NEXTAUTH_URL = 'https://test.com'

			await sendNewUserNotificationToAdmins(params)

			expect(prisma.user.findMany).toHaveBeenCalled()
		})

		it('debe usar NEXTAUTH_URL como baseUrl si está disponible', async () => {
			vi.mocked(sendEmail).mockResolvedValue({ success: true })

			process.env.NEXTAUTH_URL = 'https://nextauth.com'
			delete process.env.NEXT_PUBLIC_API_URL

			await sendNewUserNotificationToAdmins(params)

			expect(sendEmail).toHaveBeenCalledWith(
				expect.objectContaining({
					to: 'admin1@example.com',
					subject: 'Nuevo Usuario Requiere Activación - Juan Pérez',
				})
			)

			// Verificar que el HTML contiene la URL correcta y saludo personalizado
			const firstCall = vi.mocked(sendEmail).mock.calls[0][0]
			expect(firstCall.html).toContain(
				'https://nextauth.com/dashboard/admin/users/123'
			)
			expect(firstCall.html).toContain('Hola Admin One,')
		})

		it('debe usar NEXT_PUBLIC_API_URL como baseUrl si NEXTAUTH_URL no está disponible', async () => {
			vi.mocked(sendEmail).mockResolvedValue({ success: true })

			delete process.env.NEXTAUTH_URL
			process.env.NEXT_PUBLIC_API_URL = 'https://api.com'

			await sendNewUserNotificationToAdmins(params)

			const firstCall = vi.mocked(sendEmail).mock.calls[0][0]
			expect(firstCall.html).toContain(
				'https://api.com/dashboard/admin/users/123'
			)
			expect(firstCall.html).toContain('Hola Admin One,')
		})

		it('debe usar localhost como fallback si no hay variables de entorno', async () => {
			vi.mocked(sendEmail).mockResolvedValue({ success: true })

			delete process.env.NEXTAUTH_URL
			delete process.env.NEXT_PUBLIC_API_URL

			await sendNewUserNotificationToAdmins(params)

			const firstCall = vi.mocked(sendEmail).mock.calls[0][0]
			expect(firstCall.html).toContain(
				'http://localhost:3000/dashboard/admin/users/123'
			)
			expect(firstCall.html).toContain('Hola Admin One,')
		})

		it('debe enviar email a cada administrador', async () => {
			vi.mocked(sendEmail).mockResolvedValue({ success: true })

			process.env.NEXTAUTH_URL = 'https://test.com'

			await sendNewUserNotificationToAdmins(params)

			expect(sendEmail).toHaveBeenCalledTimes(2)
			expect(sendEmail).toHaveBeenCalledWith(
				expect.objectContaining({
					to: 'admin1@example.com',
				})
			)
			expect(sendEmail).toHaveBeenCalledWith(
				expect.objectContaining({
					to: 'admin2@example.com',
				})
			)
		})

		it('debe manejar caso sin administradores', async () => {
			vi.mocked(prisma.user.findMany).mockResolvedValue(
				[] as unknown as Awaited<ReturnType<typeof prisma.user.findMany>>
			)

			const consoleWarnSpy = vi
				.spyOn(console, 'warn')
				.mockImplementation(() => {})

			await sendNewUserNotificationToAdmins(params)

			expect(consoleWarnSpy).toHaveBeenCalledWith(
				'No hay administradores activos para enviar notificación'
			)
			expect(sendEmail).not.toHaveBeenCalled()

			consoleWarnSpy.mockRestore()
		})

		it('debe manejar errores sin propagar', async () => {
			vi.mocked(sendEmail).mockRejectedValue(new Error('Email service error'))

			const consoleErrorSpy = vi
				.spyOn(console, 'error')
				.mockImplementation(() => {})

			process.env.NEXTAUTH_URL = 'https://test.com'

			// No debe lanzar error
			await expect(
				sendNewUserNotificationToAdmins(params)
			).resolves.not.toThrow()

			// Debe loggear errores
			expect(consoleErrorSpy).toHaveBeenCalled()

			consoleErrorSpy.mockRestore()
		})

		it('debe manejar errores individuales sin afectar otros envíos', async () => {
			vi.mocked(sendEmail)
				.mockImplementationOnce(() => Promise.reject(new Error('Error admin1')))
				.mockResolvedValueOnce({ success: true })

			const consoleErrorSpy = vi
				.spyOn(console, 'error')
				.mockImplementation(() => {})

			process.env.NEXTAUTH_URL = 'https://test.com'

			await sendNewUserNotificationToAdmins(params)

			// Debe intentar enviar a ambos admins
			expect(sendEmail).toHaveBeenCalledTimes(2)
			// Debe loggear el error del primer admin
			expect(consoleErrorSpy).toHaveBeenCalled()

			consoleErrorSpy.mockRestore()
		})

		it('debe usar Promise.allSettled para envío paralelo', async () => {
			vi.mocked(sendEmail).mockResolvedValue({ success: true })

			process.env.NEXTAUTH_URL = 'https://test.com'

			const allSettledSpy = vi.spyOn(Promise, 'allSettled')

			await sendNewUserNotificationToAdmins(params)

			// Verificar que se usa Promise.allSettled
			expect(allSettledSpy).toHaveBeenCalled()

			allSettledSpy.mockRestore()
		})

		it('debe loggear éxito cuando el email se envía correctamente', async () => {
			vi.mocked(sendEmail).mockResolvedValue({ success: true })

			const consoleLogSpy = vi
				.spyOn(console, 'log')
				.mockImplementation(() => {})

			process.env.NEXTAUTH_URL = 'https://test.com'

			await sendNewUserNotificationToAdmins(params)

			expect(consoleLogSpy).toHaveBeenCalledWith(
				expect.stringContaining('✅ Notificación enviada exitosamente')
			)

			consoleLogSpy.mockRestore()
		})

		it('debe loggear error cuando el email falla', async () => {
			vi.mocked(sendEmail).mockResolvedValue({
				success: false,
				error: 'SendGrid error',
			})

			const consoleErrorSpy = vi
				.spyOn(console, 'error')
				.mockImplementation(() => {})

			process.env.NEXTAUTH_URL = 'https://test.com'

			await sendNewUserNotificationToAdmins(params)

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining('Error enviando notificación'),
				'SendGrid error'
			)

			consoleErrorSpy.mockRestore()
		})
	})
})
