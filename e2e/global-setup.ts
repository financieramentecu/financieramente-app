import { FullConfig } from '@playwright/test'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Cargar variables de entorno ANTES de importar módulos que usen PrismaClient
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

/**
 * Setup global que se ejecuta antes de todos los tests e2e
 * Crea el usuario de prueba en la base de datos
 */
async function globalSetup(_config: FullConfig) {
	console.log('🔧 Configurando base de datos para pruebas e2e...')

	if (!process.env.DATABASE_URL) {
		console.warn(
			'⚠️ DATABASE_URL no configurada. Saltando setup de base de datos.'
		)
		console.warn(
			'   Los tests que requieren autenticación real contra la DB fallarán.'
		)
		return
	}

	try {
		// Importar dinámicamente para que PrismaClient se cree DESPUÉS de cargar env
		const { setupTestUser, setupSSOUsers } = await import(
			'./setup/db-setup.js'
		)
		await setupTestUser()
		await setupSSOUsers()
		console.log('✅ Setup global completado')
	} catch (error) {
		console.error('❌ Error en setup global:', error)
		// No lanzar error para permitir que los tests continúen
		console.warn('⚠️ Continuando con los tests...')
	}
}

export default globalSetup
