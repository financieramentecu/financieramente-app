import dotenv from 'dotenv'
import sgMail from '@sendgrid/mail'
import { join } from 'path'

// Cargar variables de entorno manualmente
dotenv.config({ path: join(process.cwd(), '.env') })

const apiKey = process.env.SENDGRID_API_KEY
const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'soporte@financieramentecu.com'
const testRecipient = process.argv[2] || 'andres.agudelo@financieramentecu.com'

async function runTest() {
	console.log('--- SendGrid Diagnostic Script ---')

	if (!apiKey) {
		console.error('❌ Error: SENDGRID_API_KEY no encontrada en .env')
		process.exit(1)
	}

	console.log(`✅ API Key detectada (${apiKey.substring(0, 4)}...)`)
	console.log(`📧 Remitente configurado: ${fromEmail}`)
	console.log(`🎯 Destinatario de prueba: ${testRecipient}`)
	console.log('-----------------------------------')

	sgMail.setApiKey(apiKey)

	const msg = {
		to: testRecipient,
		from: {
			email: fromEmail,
			name: 'Financieramente Diagnostic',
		},
		subject: '🧪 Prueba de Entregabilidad - Financieramente',
		text: 'Si estás leyendo esto, la configuración de SendGrid y el dominio son válidos.',
		html: `
			<div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 500px; margin: 20px auto;">
				<h2 style="color: #00505C;">✅ Conexión Exitosa</h2>
				<p>Este es un correo de diagnóstico para validar la infraestructura de <strong>Financieramente</strong>.</p>
				<hr style="border: 0; border-top: 1px solid #eee;" />
				<p style="font-size: 12px; color: #666;">
					<strong>Timestamp:</strong> ${new Date().toISOString()}<br>
					<strong>From:</strong> ${fromEmail}
				</p>
			</div>
		`,
	}

	try {
		console.log('⏳ Intentando enviar correo...')
		const [response] = await sgMail.send(msg)
		console.log('✅ Correo aceptado por SendGrid!')
		console.log(`📊 Status Code: ${response.statusCode}`)
		console.log(`🆔 Message ID: ${response.headers['x-message-id']}`)
		console.log('\nSi no recibes el correo pronto, revisa tus registros SPF/DKIM.')
	} catch (error) {
		console.error('❌ Error al enviar correo:')
		const err = error as { response?: { body: unknown }; message?: string }
		if (err.response) {
			console.error(JSON.stringify(err.response.body, null, 2))
		} else {
			console.error(err.message)
		}
	}
}

runTest()
