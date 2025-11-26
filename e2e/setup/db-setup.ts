import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Usuario de prueba para e2e
 */
export const TEST_USER_EMAIL = 'test@financieramentecu.com'
export const TEST_USER_NAME = 'Test User'

/**
 * Crea o actualiza el usuario de prueba en la base de datos
 * Este usuario se usa en las pruebas e2e
 */
export async function setupTestUser() {
	try {
		// Buscar el rol ADMIN o el primer rol activo disponible
		const role = await prisma.role.findFirst({
			where: {
				OR: [{ code: 'ADMIN' }, { code: 'AGENTE' }, { active: true }],
			},
			orderBy: {
				idRole: 'asc',
			},
		})

		if (!role) {
			throw new Error(
				'No se encontró ningún rol activo. Ejecuta el seed de roles primero: npm run prisma:seed'
			)
		}

		// Buscar si el usuario ya existe
		const existingUser = await prisma.user.findUnique({
			where: { email: TEST_USER_EMAIL },
		})

		const userData = {
			name: TEST_USER_NAME.split(' ')[0] || TEST_USER_NAME,
			lastName: TEST_USER_NAME.split(' ').slice(1).join(' ') || null,
			typeIdentity: 'CC' as const,
			identityNumber: '1234567890',
			email: TEST_USER_EMAIL,
			idRole: role.idRole,
			active: true,
			entryDate: new Date(),
		}

		if (existingUser) {
			// Actualizar usuario existente
			await prisma.user.update({
				where: { idUser: existingUser.idUser },
				data: {
					...userData,
					active: true, // Asegurar que esté activo
					idRole: role.idRole, // Asegurar que tenga un rol válido
				},
			})
			console.log(`✅ Usuario de prueba actualizado: ${TEST_USER_EMAIL}`)
		} else {
			// Crear nuevo usuario
			await prisma.user.create({
				data: userData,
			})
			console.log(`✅ Usuario de prueba creado: ${TEST_USER_EMAIL}`)
		}

		return { success: true }
	} catch (error) {
		console.error('❌ Error al configurar usuario de prueba:', error)
		throw error
	}
}

/**
 * Limpia el usuario de prueba (opcional, para limpieza después de tests)
 */
export async function cleanupTestUser() {
	try {
		await prisma.user.deleteMany({
			where: {
				email: TEST_USER_EMAIL,
			},
		})
		console.log(`✅ Usuario de prueba eliminado: ${TEST_USER_EMAIL}`)
	} catch (error) {
		console.error('❌ Error al limpiar usuario de prueba:', error)
		// No lanzar error, solo loggear
	}
}

// Ejecutar setup si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
	setupTestUser()
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
