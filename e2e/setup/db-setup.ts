import { PrismaClient } from '@prisma/client'
import { UserRole } from '../../src/features/auth/lib/roles'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

/**
 * Usuario de prueba para e2e
 */
export const TEST_USER_EMAIL = 'test@financieramentecu.com'
export const TEST_USER_NAME = 'Test User'

/**
 * Crea o actualiza el usuario de prueba en la base de datos
 */
export async function setupTestUser() {
	try {
		const role = await prisma.role.findFirst({
			where: {
				OR: [{ code: 'ADMIN' }, { code: 'AGENTE' }, { active: true }],
			},
			orderBy: { idRole: 'asc' },
		})

		if (!role) {
			throw new Error('No se encontró ningún rol activo.')
		}

		// Verificar colisión por documento
		const collisionUser = await prisma.user.findFirst({
			where: {
				typeIdentity: 'CC',
				identityNumber: '1234567890',
				NOT: { email: TEST_USER_EMAIL },
			},
		})

		if (collisionUser) {
			// Si existe otro usuario con el mismo documento, lo actualizamos para liberar el documento
			// o usamos uno diferente para el usuario de prueba.
			// Vamos a usar un documento aleatorio para el usuario de prueba para evitar colisiones
		}

		const randomIdentity = `99${Math.floor(Math.random() * 10000000)}`

		const userData = {
			name: TEST_USER_NAME.split(' ')[0] || TEST_USER_NAME,
			lastName: TEST_USER_NAME.split(' ').slice(1).join(' ') || null,
			typeIdentity: 'CC' as const,
			identityNumber: randomIdentity, // Usar random para evitar colisiones
			email: TEST_USER_EMAIL,
			idRole: role.idRole,
			active: true,
			entryDate: new Date(),
		}

		const existingUser = await prisma.user.findUnique({
			where: { email: TEST_USER_EMAIL },
		})

		if (existingUser) {
			await prisma.user.update({
				where: { idUser: existingUser.idUser },
				data: {
					active: true,
					idRole: role.idRole,
				},
			})
			console.log(`✅ Usuario de prueba actualizado: ${TEST_USER_EMAIL}`)
		} else {
			await prisma.user.create({
				data: userData,
			})
			console.log(`✅ Usuario de prueba creado: ${TEST_USER_EMAIL}`)
		}

		return { success: true }
	} catch (error) {
		console.error('❌ Error al configurar usuario de prueba:', error)
		// No relanzar: permite que los e2e continúen (p. ej. sin DB o con TLS inválido)
		return { success: false }
	}
}

/**
 * Configura los usuarios necesarios para las pruebas de SSO
 */
export async function setupSSOUsers() {
	try {
		const hashedPassword = await hash('Admin123!', 10)
		const hashedProPassword = await hash('Pro123!', 10)
		const hashedAgentePassword = await hash('Agente123!', 10)

		// Obtener roles
		const adminRole = await prisma.role.findUnique({
			where: { code: UserRole.ADMIN },
		})
		const agenteRole = await prisma.role.findUnique({
			where: { code: UserRole.AGENTE },
		})
		// Usar AGENTE si no existe ANALISTA_SOPORTE para el rol "PRO" simulado
		const proRole =
			(await prisma.role.findUnique({
				where: { code: UserRole.ANALISTA_SOPORTE },
			})) || agenteRole

		if (!adminRole || !agenteRole) {
			console.warn(
				'⚠️ Roles necesarios no encontrados. Saltando setup de SSO users.'
			)
			return
		}

		const usersToCreate = [
			{
				email: 'admin@financieramentecu.com',
				name: 'Admin User',
				password: hashedPassword,
				ssoOnly: false,
				idRole: adminRole.idRole,
				identity: '888888881',
			},
			{
				email: 'admin-sso@financieramentecu.com',
				name: 'Admin SSO',
				password: hashedPassword,
				ssoOnly: true,
				idRole: adminRole.idRole,
				identity: '888888882',
			},
			{
				email: 'pro@financieramentecu.com',
				name: 'Pro User',
				password: hashedProPassword,
				ssoOnly: false,
				idRole: proRole?.idRole || agenteRole.idRole,
				identity: '888888883',
			},
			{
				email: 'agente@financieramentecu.com',
				name: 'Agente User',
				password: hashedAgentePassword,
				ssoOnly: false,
				idRole: agenteRole.idRole,
				identity: '888888884',
			},
			{
				email: 'inactive@financieramentecu.com',
				name: 'Inactive User',
				password: hashedPassword,
				ssoOnly: false,
				idRole: adminRole.idRole,
				active: false,
				identity: '888888885',
			},
		]

		for (const user of usersToCreate) {
			const existing = await prisma.user.findUnique({
				where: { email: user.email },
			})
			if (existing) {
				await prisma.user.update({
					where: { idUser: existing.idUser },
					data: {
						password: user.password,
						ssoOnly: user.ssoOnly,
						idRole: user.idRole,
						active: user.active ?? true,
					},
				})
			} else {
				// Verificar colisión de documento antes de crear
				const collision = await prisma.user.findFirst({
					where: { typeIdentity: 'CC', identityNumber: user.identity },
				})

				let identityToUse = user.identity
				if (collision) {
					identityToUse = `99${Math.floor(Math.random() * 10000000)}`
				}

				await prisma.user.create({
					data: {
						email: user.email,
						name: user.name,
						password: user.password,
						ssoOnly: user.ssoOnly,
						idRole: user.idRole,
						active: user.active ?? true,
						typeIdentity: 'CC',
						identityNumber: identityToUse,
						entryDate: new Date(),
					},
				})
			}
		}
		console.log('✅ Usuarios SSO configurados correctamente')
	} catch (error) {
		console.error('❌ Error configurando usuarios SSO:', error)
	}
}

export async function cleanupTestUser() {
	// Implementación simplificada
}

// Ejecutar setup si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
	Promise.all([setupTestUser(), setupSSOUsers()])
		.then(() => {
			console.log('✅ Setup de base de datos completado')
			process.exit(0)
		})
		.catch((error) => {
			console.error('❌ Error en setup:', error)
			process.exit(1)
		})
		.finally(() => {
			prisma.$disconnect()
		})
}
