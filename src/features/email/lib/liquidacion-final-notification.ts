import { sendEmail } from './email-service'
import type { EmailResult } from '../types/email.types'
import {
	buildEmailTemplate,
	escapeHtml,
	EMAIL_DESIGN_TOKENS,
} from './email-template-base'

/**
 * Parámetros para enviar el correo de liquidación final a un usuario.
 */
export interface LiquidacionFinalEmailParams {
	to: string
	nombreUsuario?: string
	periodo: string
	totalNeto: number
	cantidadNegocios: number
	filas: Array<{
		nombreNegocio: string
		valorNeto: number
		categoria?: string
	}>
}

function formatMoney(n: number): string {
	return new Intl.NumberFormat('es-EC', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 2,
	}).format(n)
}

/**
 * Genera el HTML del correo de liquidación final.
 */
export function buildLiquidacionFinalHtml(
	params: LiquidacionFinalEmailParams,
	baseUrl: string
): string {
	const saludo = params.nombreUsuario
		? `Hola ${escapeHtml(params.nombreUsuario)},`
		: 'Hola,'

	const tableRows = params.filas
		.map(
			(f) =>
				`<tr>
					<td data-label="Negocio">${escapeHtml(f.nombreNegocio)}</td>
					<td data-label="Valor Neto" style="text-align:right">${formatMoney(f.valorNeto)}</td>
					<td data-label="Categoría">${escapeHtml(f.categoria ?? '-')}</td>
				</tr>`
		)
		.join('')

	const tableStyles = `
		.liquidacion-table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 14px; }
		.liquidacion-table th, .liquidacion-table td { padding: 10px 12px; border: 1px solid ${EMAIL_DESIGN_TOKENS.borderMuted}; text-align: left; }
		.liquidacion-table th { background: ${EMAIL_DESIGN_TOKENS.bgMuted}; font-weight: 600; color: ${EMAIL_DESIGN_TOKENS.primary}; }
		.liquidacion-table td[style*="text-align:right"] { text-align: right; }
		.total-box { background: ${EMAIL_DESIGN_TOKENS.bgMuted}; padding: 20px; border-radius: 8px; margin: 24px 0; border: 1px solid ${EMAIL_DESIGN_TOKENS.borderMuted}; }
		.total-box p { margin: 5px 0; font-size: 16px; }
		.total-amount { font-size: 24px; font-weight: 700; color: ${EMAIL_DESIGN_TOKENS.primary}; margin-top: 10px; }
		@media only screen and (max-width: 600px) {
			.liquidacion-table, .liquidacion-table thead, .liquidacion-table tbody, .liquidacion-table th, .liquidacion-table td, .liquidacion-table tr { display: block; }
			.liquidacion-table thead tr { position: absolute; left: -9999px; }
			.liquidacion-table tr { border: 1px solid ${EMAIL_DESIGN_TOKENS.borderMuted}; margin-bottom: 1rem; border-radius: 6px; overflow: hidden; }
			.liquidacion-table td { padding: 8px 12px; border: none; border-bottom: 1px solid ${EMAIL_DESIGN_TOKENS.borderMuted}; padding-left: 50%; position: relative; text-align: right !important; }
			.liquidacion-table td:last-child { border-bottom: none; }
			.liquidacion-table td::before { content: attr(data-label); font-weight: 600; color: ${EMAIL_DESIGN_TOKENS.textSecondary}; position: absolute; left: 12px; width: 45%; text-align: left; }
		}
	`

	const content = `
		<p class="greeting">${saludo}</p>
		<p class="message">
			¡Buenas noticias! Se ha completado la **liquidación final** de tus comisiones.
		</p>

		<div class="total-box">
			<p>Total neto a recibir para el periodo <strong>${escapeHtml(params.periodo)}</strong>:</p>
			<p class="total-amount">${formatMoney(params.totalNeto)}</p>
			<p style="font-size: 14px; color: ${EMAIL_DESIGN_TOKENS.textMuted};">Basado en ${params.cantidadNegocios} registros liquidados.</p>
		</div>

		<h3 style="color: ${EMAIL_DESIGN_TOKENS.primary}; margin-top: 32px;">Detalle de la Liquidación</h3>
		<div style="overflow-x: auto;">
			<table class="liquidacion-table">
				<thead>
					<tr>
						<th>Negocio</th>
						<th style="text-align:right">Valor Neto</th>
						<th>Categoría</th>
					</tr>
				</thead>
				<tbody>
					${tableRows}
				</tbody>
			</table>
		</div>

		<p class="message" style="margin-top: 24px;">
			Puedes revisar el historial completo y los comprobantes detallados en el portal de Financieramente.
		</p>
	`

	const logoUrl = `${baseUrl}/logos/logo-verde.svg`

	const html = buildEmailTemplate({
		title: '✅ Liquidación Final Completada',
		subtitle: 'Sistema Financieramente',
		logoUrl,
		content,
		showLogoImage: true,
	})

	return html.replace(
		'</style>',
		`${tableStyles}</style>`
	)
}

/**
 * Genera el texto plano del correo de liquidación final.
 */
export function generateLiquidacionFinalPlainText(
	params: LiquidacionFinalEmailParams
): string {
	const saludo = params.nombreUsuario
		? `Hola ${params.nombreUsuario},`
		: 'Hola,'

	const filasTexto = params.filas
		.map(
			(f) =>
				`  - ${f.nombreNegocio}: ${formatMoney(f.valorNeto)}${f.categoria ? ` (${f.categoria})` : ''}`
		)
		.join('\n')

	return `
Liquidación Final Completada
Sistema Financieramente

${saludo}

Se ha completado la liquidación final de tus comisiones para el periodo ${params.periodo}.

Total neto a recibir: ${formatMoney(params.totalNeto)}
Registros liquidados: ${params.cantidadNegocios}

Detalle:
${filasTexto}

Puedes revisar el detalle completo en el portal de Financieramente.

Este es un correo automático del sistema Financieramente.
	`.trim()
}

/**
 * Envía un correo de liquidación final exitosa.
 */
export async function sendLiquidacionFinalEmail(
	params: LiquidacionFinalEmailParams
): Promise<EmailResult> {
	const baseUrl =
		process.env.NEXTAUTH_URL ||
		process.env.NEXT_PUBLIC_API_URL ||
		'http://localhost:3000'

	const subject = `✅ Liquidación Final Completada - Periodo ${params.periodo}`
	const html = buildLiquidacionFinalHtml(params, baseUrl)
	const text = generateLiquidacionFinalPlainText(params)

	return sendEmail({
		to: params.to,
		subject,
		html,
		text,
	})
}
