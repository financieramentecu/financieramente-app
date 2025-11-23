import { FullConfig } from '@playwright/test'
import { setupTestUser } from './setup/db-setup'

/**
 * Setup global que se ejecuta antes de todos los tests e2e
 * Crea el usuario de prueba en la base de datos
 */
async function globalSetup(config: FullConfig) {
	console.log('🔧 Configurando base de datos para pruebas e2e...')

	try {
		await setupTestUser()
		console.log('✅ Setup global completado')
	} catch (error) {
		console.error('❌ Error en setup global:', error)
		// No lanzar error para permitir que los tests continúen
		// El usuario puede ya existir o puede haber otros problemas
		console.warn('⚠️ Continuando con los tests...')
	}
}

export default globalSetup
