import { sendEmail } from './email-service'
import type { EmailResult } from '../types/email.types'
import {
	buildEmailTemplate,
	escapeHtml,
	EMAIL_DESIGN_TOKENS,
} from './email-template-base'

/**
 * Tipo de correo de notificación enlazado:
 * - `PRE_LIQUIDACION`: pre-liquidación en revisión; el coach debe verificar
 *   y presionar "Estoy de acuerdo".
 * - `LIQUIDACION`: comprobante final tras liquidar.
 */
export type DistribucionLinkKind = 'PRE_LIQUIDACION' | 'LIQUIDACION'

/**
 * Parámetros para enviar un correo de notificación con link al detalle del
 * recibo de distribución.
 *
 * Reemplaza al envío por tabla: el correo contiene un CTA al detalle con el
 * total neto y el número de contratos como resumen corto, sin exponer el
 * desglose por negocio en el cuerpo del email.
 */
export interface DistribucionLinkEmailParams {
	to: string
	nombreUsuario?: string
	kind: DistribucionLinkKind
	archivoNombre: string
	periodo: string
	fileImportId: number
	/** Total neto a recibir en el archivo (moneda USD) */
	totalNeta: number
	/** Cantidad de contratos incluidos en la distribución */
	countContratos: number
	/** Cantidad de negocios distintos representados en la distribución */
	countNegocios?: number
}

function formatMoney(n: number): string {
	return new Intl.NumberFormat('es-EC', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 2,
	}).format(n)
}

interface CopyBundle {
	title: string
	subject: string
	intro: string
	cta: string
	footerNote: string
}

function getCopy(kind: DistribucionLinkKind): CopyBundle {
	if (kind === 'LIQUIDACION') {
		return {
			title: 'Comprobante de liquidación',
			subject: 'Comprobante de liquidación',
			intro:
				'Tu liquidación ha sido procesada. Revisa el detalle completo (bruta, descuentos, clawback y neta) de tu comprobante en el portal.',
			cta: 'Ver mi comprobante',
			footerNote:
				'Este correo confirma la liquidación final; el valor neto se procesará según el cronograma de pagos.',
		}
	}
	return {
		title: 'Resumen de pre-liquidación',
		subject: 'Resumen de pre-liquidación',
		intro:
			'Hay una pre-liquidación disponible para tu revisión. Ingresa al portal para ver el detalle completo y dejar constancia de tu acuerdo.',
		cta: 'Ver mi distribución',
		footerNote:
			'Si algún valor no coincide con tu expectativa, responde este correo o contacta a la oficina operativa antes de aprobar.',
	}
}

function buildLink(baseUrl: string, fileImportId: number): string {
	return `${baseUrl.replace(/\/$/, '')}/dashboard/mis-distribuciones/${fileImportId}`
}

/**
 * Genera el HTML del correo de distribución con link.
 */
export function buildDistribucionLinkHtml(
	params: DistribucionLinkEmailParams,
	baseUrl: string
): string {
	const copy = getCopy(params.kind)
	const saludo = params.nombreUsuario
		? `Hola ${escapeHtml(params.nombreUsuario)},`
		: 'Hola,'

	const link = buildLink(baseUrl, params.fileImportId)
	const escapedLink = escapeHtml(link)
	const contratosText =
		params.countContratos === 1
			? '1 contrato'
			: `${params.countContratos} contratos`
	const negociosLine =
		params.countNegocios != null
			? `<p style="margin: 6px 0; color: ${EMAIL_DESIGN_TOKENS.textSecondary};">Negocios incluidos: <strong>${params.countNegocios}</strong></p>`
			: ''

	const content = `
		<p class="greeting">${saludo}</p>
		<p class="message">
			${copy.intro}
		</p>

		<div class="info-box" role="note" aria-label="Resumen de distribución">
			<h3>${escapeHtml(params.archivoNombre)}</h3>
			<p>Periodo: <strong>${escapeHtml(params.periodo)}</strong></p>
			<p>Registros: <strong>${escapeHtml(contratosText)}</strong></p>
			${negociosLine}
			<p style="margin-top: 12px; font-size: 18px; color: ${EMAIL_DESIGN_TOKENS.primary};">
				Total neto: <strong>${formatMoney(params.totalNeta)}</strong>
			</p>
		</div>

		<div class="cta-container">
			<a href="${escapedLink}" class="cta-button" target="_blank" rel="noopener">
				${escapeHtml(copy.cta)}
			</a>
		</div>

		<p class="link-alternative">
			Si el botón no funciona, copia y pega este enlace en tu navegador:<br/>
			<a href="${escapedLink}" target="_blank" rel="noopener">${escapedLink}</a>
		</p>

		<p class="message" style="margin-top: 24px; font-size: 14px; color: ${EMAIL_DESIGN_TOKENS.textMuted};">
			${escapeHtml(copy.footerNote)}
		</p>
	`

	const logoUrl = `${baseUrl}/logos/logo-verde.svg`

	return buildEmailTemplate({
		title: copy.title,
		subtitle: 'Sistema Financieramente',
		logoUrl,
		content,
		showLogoImage: true,
	})
}

/**
 * Genera el texto plano del correo.
 */
export function generateDistribucionLinkPlainText(
	params: DistribucionLinkEmailParams,
	baseUrl: string
): string {
	const copy = getCopy(params.kind)
	const saludo = params.nombreUsuario
		? `Hola ${params.nombreUsuario},`
		: 'Hola,'
	const link = buildLink(baseUrl, params.fileImportId)
	const contratosText =
		params.countContratos === 1
			? '1 contrato'
			: `${params.countContratos} contratos`

	return `
${copy.title}
Sistema Financieramente

${saludo}

${copy.intro}

Archivo: ${params.archivoNombre}
Periodo: ${params.periodo}
Registros: ${contratosText}
Total neto: ${formatMoney(params.totalNeta)}

Abre el detalle:
${link}

${copy.footerNote}

Este es un correo automático del sistema Financieramente.
`.trim()
}

/**
 * Envía un correo con link al detalle de distribución (pre-liquidación o
 * liquidación, según `params.kind`).
 */
export async function sendDistribucionLinkEmail(
	params: DistribucionLinkEmailParams
): Promise<EmailResult> {
	const baseUrl =
		process.env.NEXTAUTH_URL ||
		process.env.NEXT_PUBLIC_API_URL ||
		'http://localhost:3000'

	const copy = getCopy(params.kind)
	const subject = `${copy.subject}: ${params.archivoNombre} - ${params.periodo}`
	const html = buildDistribucionLinkHtml(params, baseUrl)
	const text = generateDistribucionLinkPlainText(params, baseUrl)

	return sendEmail({
		to: params.to,
		subject,
		html,
		text,
	})
}
