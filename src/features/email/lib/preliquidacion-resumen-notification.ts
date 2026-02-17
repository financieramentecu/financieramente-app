import { sendEmail } from './email-service'
import type { EmailResult } from '../types/email.types'
import {
	buildEmailTemplate,
	escapeHtml,
	EMAIL_DESIGN_TOKENS,
} from './email-template-base'

/**
 * Parámetros para enviar el correo de resumen de pre-liquidación a un usuario.
 * El feature email no depende de tipos de pre-liquidación.
 */
export interface ResumenPreliquidacionEmailParams {
	to: string
	nombreUsuario?: string
	archivoNombre: string
	periodo: string
	filas: Array<{
		nombreNegocio: string
		valorComision: number
		categoriaConcepto?: string
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
 * Genera el HTML del correo de resumen de pre-liquidación.
 * Usa sistema de diseño unificado, viewport, media queries para móvil y tabla responsive.
 */
export function buildResumenPreliquidacionHtml(
	params: ResumenPreliquidacionEmailParams,
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
					<td data-label="Valor comisión" style="text-align:right">${formatMoney(f.valorComision)}</td>
					<td data-label="Categoría">${escapeHtml(f.categoriaConcepto ?? '-')}</td>
				</tr>`
		)
		.join('')

	const tableStyles = `
		.resumen-table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 14px; }
		.resumen-table th, .resumen-table td { padding: 10px 12px; border: 1px solid ${EMAIL_DESIGN_TOKENS.borderMuted}; text-align: left; }
		.resumen-table th { background: ${EMAIL_DESIGN_TOKENS.bgMuted}; font-weight: 600; color: ${EMAIL_DESIGN_TOKENS.primary}; }
		.resumen-table td[style*="text-align:right"] { text-align: right; }
		@media only screen and (max-width: 600px) {
			.resumen-table, .resumen-table thead, .resumen-table tbody, .resumen-table th, .resumen-table td, .resumen-table tr { display: block; }
			.resumen-table thead tr { position: absolute; left: -9999px; }
			.resumen-table tr { border: 1px solid ${EMAIL_DESIGN_TOKENS.borderMuted}; margin-bottom: 1rem; border-radius: 6px; overflow: hidden; }
			.resumen-table td { padding: 8px 12px; border: none; border-bottom: 1px solid ${EMAIL_DESIGN_TOKENS.borderMuted}; padding-left: 50%; position: relative; text-align: right !important; }
			.resumen-table td:last-child { border-bottom: none; }
			.resumen-table td::before { content: attr(data-label); font-weight: 600; color: ${EMAIL_DESIGN_TOKENS.textSecondary}; position: absolute; left: 12px; width: 45%; text-align: left; }
		}
	`

	const content = `
		<p class="greeting">${saludo}</p>
		<p class="message">
			Te enviamos el resumen de la pre-liquidación correspondiente al archivo <strong>${escapeHtml(params.archivoNombre)}</strong>, periodo <strong>${escapeHtml(params.periodo)}</strong>.
		</p>
		<div style="overflow-x: auto;">
			<table class="resumen-table" style="width:100%; border-collapse: collapse; margin: 1rem 0; font-size: 14px;">
				<thead>
					<tr>
						<th style="padding: 10px 12px; border: 1px solid ${EMAIL_DESIGN_TOKENS.borderMuted}; text-align: left; background: ${EMAIL_DESIGN_TOKENS.bgMuted}; font-weight: 600;">Negocio</th>
						<th style="padding: 10px 12px; border: 1px solid ${EMAIL_DESIGN_TOKENS.borderMuted}; text-align: right; background: ${EMAIL_DESIGN_TOKENS.bgMuted}; font-weight: 600;">Valor comisión</th>
						<th style="padding: 10px 12px; border: 1px solid ${EMAIL_DESIGN_TOKENS.borderMuted}; text-align: left; background: ${EMAIL_DESIGN_TOKENS.bgMuted}; font-weight: 600;">Categoría</th>
					</tr>
				</thead>
				<tbody>
					${tableRows}
				</tbody>
			</table>
		</div>
	`

	const logoUrl = `${baseUrl}/logos/logo-verde.svg`

	const html = buildEmailTemplate({
		title: 'Resumen de pre-liquidación',
		subtitle: 'Sistema Financieramente',
		logoUrl,
		content,
		showLogoImage: true,
	})

	// Inject table-specific styles into the template (base doesn't include .resumen-table)
	return html.replace(
		'</style>',
		`${tableStyles}</style>`
	)
}

/**
 * Genera el texto plano del correo de resumen de pre-liquidación.
 */
export function generateResumenPreliquidacionPlainText(
	params: ResumenPreliquidacionEmailParams
): string {
	const saludo = params.nombreUsuario
		? `Hola ${params.nombreUsuario},`
		: 'Hola,'

	const filasTexto = params.filas
		.map(
			(f) =>
				`  - ${f.nombreNegocio}: ${formatMoney(f.valorComision)}${f.categoriaConcepto ? ` (${f.categoriaConcepto})` : ''}`
		)
		.join('\n')

	return `
Resumen de pre-liquidación
Sistema Financieramente

${saludo}

Te enviamos el resumen de la pre-liquidación correspondiente al archivo ${params.archivoNombre}, periodo ${params.periodo}.

Negocios:
${filasTexto}

Este es un correo automático del sistema Financieramente.
	`.trim()
}

/**
 * Envía un correo con el resumen de pre-liquidación a un usuario.
 */
export async function sendResumenPreliquidacionEmail(
	params: ResumenPreliquidacionEmailParams
): Promise<EmailResult> {
	const baseUrl =
		process.env.NEXTAUTH_URL ||
		process.env.NEXT_PUBLIC_API_URL ||
		'http://localhost:3000'

	const subject = `Resumen de pre-liquidación: ${params.archivoNombre} - ${params.periodo}`
	const html = buildResumenPreliquidacionHtml(params, baseUrl)
	const text = generateResumenPreliquidacionPlainText(params)

	return sendEmail({
		to: params.to,
		subject,
		html,
		text,
	})
}
