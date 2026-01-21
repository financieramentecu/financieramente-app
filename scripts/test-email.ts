#!/usr/bin/env tsx

/**
 * Script de prueba interactivo para el sistema de email
 *
 * Uso:
 *   npm run test:email tu-email@ejemplo.com
 *   npm run test:email tu-email@ejemplo.com templated d-xxxxxxxx
 */

// Cargar variables de entorno desde .env.local y .env
import { config } from 'dotenv'
import { resolve } from 'path'

// Cargar .env.local primero (tiene prioridad)
config({ path: resolve(process.cwd(), '.env.local') })
// Luego cargar .env como fallback
config({ path: resolve(process.cwd(), '.env') })

import {
	sendEmail,
	sendTemplatedEmail as sendTemplatedEmailService,
} from '../src/features/email/lib/email-service'
import { SendGridConfig } from '../src/features/email/lib/sendgrid-config'

// Colores para la consola
const colors = {
	reset: '\x1b[0m',
	bright: '\x1b[1m',
	green: '\x1b[32m',
	red: '\x1b[31m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	cyan: '\x1b[36m',
}

function log(message: string, color: keyof typeof colors = 'reset') {
	console.log(`${colors[color]}${message}${colors.reset}`)
}

function logSuccess(message: string) {
	log(`✅ ${message}`, 'green')
}

function logError(message: string) {
	log(`❌ ${message}`, 'red')
}

function logWarning(message: string) {
	log(`⚠️  ${message}`, 'yellow')
}

function logInfo(message: string) {
	log(`ℹ️  ${message}`, 'cyan')
}

function logHeader(message: string) {
	console.log()
	log(`${'='.repeat(60)}`, 'bright')
	log(message, 'bright')
	log(`${'='.repeat(60)}`, 'bright')
	console.log()
}

async function verifyConfiguration(): Promise<boolean> {
	logHeader('🔍 Verificando Configuración de SendGrid')

	try {
		SendGridConfig.validate()
		logSuccess('Configuración válida')

		logInfo(`API Key: ${process.env.SENDGRID_API_KEY?.substring(0, 10)}...`)
		logInfo(`From Email: ${SendGridConfig.getFromEmail()}`)
		logInfo(`From Name: ${SendGridConfig.getFromName()}`)

		if (process.env.SENDGRID_TEMPLATE_ID) {
			logInfo(`Template ID: ${process.env.SENDGRID_TEMPLATE_ID}`)
		} else {
			logWarning('Template ID no configurado (opcional)')
		}

		return true
	} catch (error) {
		logError('Configuración inválida')
		if (error instanceof Error) {
			logError(error.message)
		}
		console.log()
		logInfo('Para configurar SendGrid, edita tu archivo .env.local:')
		console.log()
		console.log('SENDGRID_API_KEY=SG.tu-api-key-aqui')
		console.log('SENDGRID_FROM_EMAIL=tu-email-verificado@ejemplo.com')
		console.log('SENDGRID_FROM_NAME=Financieramente Test')
		console.log()
		return false
	}
}

async function sendTraditionalEmail(to: string): Promise<void> {
	logHeader('📧 Enviando Email Tradicional')

	try {
		const textContent = `Este es un email de prueba del sistema Financieramente.

Si recibes este mensaje, significa que la configuración de SendGrid está funcionando correctamente.

Detalles:
- Enviado desde: ${SendGridConfig.getFromEmail()}
- Nombre del remitente: ${SendGridConfig.getFromName()}
- Fecha: ${new Date().toLocaleString('es-EC')}
- Script: test-email.ts

¡Todo está funcionando! 🎉`

		const htmlContent = `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<style>
		body {
			font-family: Arial, sans-serif;
			line-height: 1.6;
			color: #333;
			max-width: 600px;
			margin: 0 auto;
			padding: 20px;
		}
		.header {
			background: linear-gradient(135deg, #00505C 0%, #83D874 100%);
			color: white;
			padding: 30px;
			text-align: center;
			border-radius: 8px 8px 0 0;
		}
		.content {
			background: #f9f9f9;
			padding: 30px;
			border-radius: 0 0 8px 8px;
		}
		.badge {
			display: inline-block;
			background: #83D874;
			color: white;
			padding: 8px 16px;
			border-radius: 20px;
			font-size: 14px;
			font-weight: bold;
		}
		.details {
			background: white;
			padding: 20px;
			border-left: 4px solid #00505C;
			margin: 20px 0;
		}
		.footer {
			text-align: center;
			color: #666;
			font-size: 12px;
			margin-top: 20px;
		}
	</style>
</head>
<body>
	<div class="header">
		<h1>🧪 Email de Prueba</h1>
		<p>Sistema Financieramente</p>
	</div>
	<div class="content">
		<p><span class="badge">✅ Configuración Exitosa</span></p>
		<p>Si recibes este mensaje, significa que la configuración de SendGrid está funcionando correctamente.</p>
		
		<div class="details">
			<h3>Detalles del Envío</h3>
			<ul>
				<li><strong>Enviado desde:</strong> ${SendGridConfig.getFromEmail()}</li>
				<li><strong>Nombre del remitente:</strong> ${SendGridConfig.getFromName()}</li>
				<li><strong>Fecha:</strong> ${new Date().toLocaleString('es-EC')}</li>
				<li><strong>Tipo:</strong> Email Tradicional (HTML + Texto Plano)</li>
				<li><strong>Script:</strong> test-email.ts</li>
			</ul>
		</div>
		
		<p style="text-align: center; font-size: 24px; margin: 30px 0;">
			¡Todo está funcionando! 🎉
		</p>
	</div>
	<div class="footer">
		<p>Este es un email de prueba generado automáticamente.</p>
		<p>Financieramente © ${new Date().getFullYear()}</p>
	</div>
</body>
</html>
		`

		logInfo(`Enviando email a: ${to}`)
		logInfo('Espera un momento...')

		const result = await sendEmail({
			to,
			subject: '🧪 Email de Prueba - Financieramente',
			text: textContent,
			html: htmlContent,
		})

		if (result.success) {
			logSuccess('Email enviado exitosamente!')
			if (result.messageId) {
				logInfo(`Message ID: ${result.messageId}`)
			}
			if (result.statusCode) {
				logInfo(`Status Code: ${result.statusCode}`)
			}
			console.log()
			logInfo(`Revisa la bandeja de entrada de: ${to}`)
		} else {
			logError('Error al enviar email')
			logError(result.error || 'Error desconocido')
			if (result.statusCode) {
				logError(`Status Code: ${result.statusCode}`)
			}
		}
	} catch (error) {
		logError('Error al enviar email')
		if (error instanceof Error) {
			logError(error.message)
		}
	}
}

async function sendTemplatedEmail(
	to: string,
	templateId: string
): Promise<void> {
	logHeader('📧 Enviando Email con Template Dinámico')

	try {
		const dynamicData = {
			nombre: 'Usuario de Prueba',
			mensaje: 'Este es un email de prueba con template dinámico',
			fecha: new Date().toLocaleString('es-EC'),
			empresa: 'Financieramente',
		}

		logInfo(`Enviando email a: ${to}`)
		logInfo(`Template ID: ${templateId}`)
		logInfo('Datos dinámicos:')
		console.log(JSON.stringify(dynamicData, null, 2))
		logInfo('Espera un momento...')

		const result = await sendTemplatedEmailService({
			to,
			templateId,
			dynamicTemplateData: dynamicData,
		})

		if (result.success) {
			logSuccess('Email con template enviado exitosamente!')
			if (result.messageId) {
				logInfo(`Message ID: ${result.messageId}`)
			}
			if (result.statusCode) {
				logInfo(`Status Code: ${result.statusCode}`)
			}
			console.log()
			logInfo(`Revisa la bandeja de entrada de: ${to}`)
		} else {
			logError('Error al enviar email con template')
			logError(result.error || 'Error desconocido')
			if (result.statusCode) {
				logError(`Status Code: ${result.statusCode}`)
			}
		}
	} catch (error) {
		logError('Error al enviar email con template')
		if (error instanceof Error) {
			logError(error.message)
		}
	}
}

async function main() {
	console.clear()
	logHeader('🧪 Script de Prueba de Email - Financieramente')

	// Verificar configuración
	const isConfigured = await verifyConfiguration()
	if (!isConfigured) {
		process.exit(1)
	}

	// Obtener argumentos de línea de comandos
	const args = process.argv.slice(2)

	// Si se pasan argumentos, usar esos
	if (args.length > 0) {
		const to = args[0]
		const type = args[1] || 'traditional'

		if (type === 'templated') {
			const templateId = args[2] || process.env.SENDGRID_TEMPLATE_ID || ''
			if (!templateId) {
				logError(
					'Para enviar email con template, proporciona el template ID como tercer argumento'
				)
				logInfo(
					'Uso: npm run test:email tu-email@ejemplo.com templated d-xxxxxxxx'
				)
				process.exit(1)
			}
			await sendTemplatedEmail(to, templateId)
		} else {
			await sendTraditionalEmail(to)
		}
	} else {
		// Modo interactivo
		logInfo('Modo interactivo')
		console.log()
		logWarning(
			'Para usar este script, proporciona el email de destino como argumento:'
		)
		console.log()
		log('  Email tradicional:', 'bright')
		console.log('  npm run test:email tu-email@ejemplo.com')
		console.log()
		log('  Email con template:', 'bright')
		console.log(
			'  npm run test:email tu-email@ejemplo.com templated d-xxxxxxxx'
		)
		console.log()
		logInfo('Ejemplo:')
		console.log(`  npm run test:email ${SendGridConfig.getFromEmail()}`)
		console.log()
	}

	console.log()
	logHeader('✨ Script Finalizado')
}

// Ejecutar script
main().catch((error) => {
	logError('Error fatal en el script')
	console.error(error)
	process.exit(1)
})
