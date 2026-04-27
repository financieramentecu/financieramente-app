import { sendResumenPreliquidacionEmail } from '../src/features/email/lib/preliquidacion-resumen-notification'
import {
	generateNotificationHTML,
	generateNotificationPlainText,
} from '../src/features/email/lib/admin-notifications'
import { sendUserActivationEmail } from '../src/features/email/lib/user-activation-notification'
import { sendLiquidacionFinalEmail } from '../src/features/email/lib/liquidacion-final-notification'
import * as dotenv from 'dotenv'
import { sendEmail } from '../src/features/email/lib/email-service'

// Cargar variables de entorno
dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

async function main() {
	// Parse simple de argumentos
	const args = process.argv.slice(2)
	const type = args[0] || 'all'

	// Buscar argumento --to
	let recipient = 'andres.agudelo@financieramentecu.com'
	const toIndex = args.indexOf('--to')
	if (toIndex !== -1 && args[toIndex + 1]) {
		recipient = args[toIndex + 1]
	}

	console.log(`\n--- Test de Notificaciones Financieramente ---`)
	console.log(`📧 Destinatario: ${recipient}`)
	console.log(`🛠️  Tipo: ${type}\n`)

	const tests = {
		preliquidacion: async () => {
			console.log('⏳ Probando: Resumen Pre-liquidación...')
			return sendResumenPreliquidacionEmail({
				to: recipient,
				nombreUsuario: 'Andrés Agudelo',
				archivoNombre: 'Comisiones_Abril_2026.xlsx',
				periodo: 'Abril 2026',
				filas: [
					{
						nombreNegocio: 'Contrato #8822',
						valorComision: 450.5,
						categoriaConcepto: 'Agente Principal',
					},
					{
						nombreNegocio: 'Contrato #9910',
						valorComision: 125.0,
						categoriaConcepto: 'Bono Coach',
					},
					{
						nombreNegocio: 'Contrato #7733',
						valorComision: 80.25,
						categoriaConcepto: 'Upline Lider',
					},
				],
			})
		},
		admin: async () => {
			console.log('⏳ Probando: Notificación Admin (Nuevo Usuario)...')
			// Mock de envío a administradores (enviará al recipient configurado en el test)
			// Nota: sendNewUserNotificationToAdmins busca en DB, para el test usaremos la lógica interna

			const html = generateNotificationHTML({
				userId: 999,
				userName: 'Nuevo Usuario Test',
				userEmail: 'nuevo.usuario@test.com',
				baseUrl: 'http://localhost:3000',
				adminName: 'Administrador Andrés',
			})
			const text = generateNotificationPlainText({
				userId: 999,
				userName: 'Nuevo Usuario Test',
				userEmail: 'nuevo.usuario@test.com',
				baseUrl: 'http://localhost:3000',
				adminName: 'Administrador Andrés',
			})

			return sendEmail({
				to: recipient,
				subject: '🔔 TEST: Nuevo Usuario Registrado',
				html,
				text,
			})
		},
		activation: async () => {
			console.log('⏳ Probando: Activación de Usuario...')
			return sendUserActivationEmail({
				userName: 'Andrés Agudelo',
				userEmail: recipient,
				roleName: 'AGENTE / COACH'
			})
		},
		liquidacion: async () => {
			console.log('⏳ Probando: Liquidación Final...')
			return sendLiquidacionFinalEmail({
				to: recipient,
				nombreUsuario: 'Andrés Agudelo',
				periodo: 'Marzo 2026',
				totalNeto: 12450.75,
				cantidadNegocios: 12,
				filas: [
					{ nombreNegocio: 'Contrato #5522', valorNeto: 5000.00, categoria: 'Agente' },
					{ nombreNegocio: 'Contrato #4411', valorNeto: 3500.25, categoria: 'Agente' },
					{ nombreNegocio: 'Bono Trimestral', valorNeto: 3950.50, categoria: 'Performance' }
				]
			})
		}
	}

	if (type === 'all') {
		for (const [name, fn] of Object.entries(tests)) {
			const result = await fn()
			console.log(`${result.success ? '✅' : '❌'} ${name}: ${result.success ? 'Enviado' : result.error}\n`)
		}
	} else if (tests[type as keyof typeof tests]) {
		const result = await tests[type as keyof typeof tests]()
		console.log(`${result.success ? '✅' : '❌'} ${type}: ${result.success ? 'Enviado' : result.error}\n`)
	} else {
		console.log(`❌ Tipo de test desconocido: ${type}`)
		console.log(`Opciones: ${Object.keys(tests).join(', ')}, all`)
	}
}

main().catch(console.error)
