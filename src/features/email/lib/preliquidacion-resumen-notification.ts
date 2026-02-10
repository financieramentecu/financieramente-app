import { sendEmail } from './email-service'
import type { EmailResult } from '../types/email.types'

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

/**
 * Genera el HTML del correo de resumen de pre-liquidación (tabla por negocio).
 */
export function buildResumenPreliquidacionHtml(
	params: ResumenPreliquidacionEmailParams
): string {
	const saludo = params.nombreUsuario
		? `Hola ${params.nombreUsuario},`
		: 'Hola,'
	const rows = params.filas
		.map(
			(f) =>
				`    <tr><td>${escapeHtml(f.nombreNegocio)}</td><td style="text-align:right">${formatMoney(f.valorComision)}</td><td>${escapeHtml(f.categoriaConcepto ?? '-')}</td></tr>`
		)
		.join('\n')

	return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Resumen pre-liquidación</title></head>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  <p>${saludo}</p>
  <p>Te enviamos el resumen de la pre-liquidación correspondiente al archivo <strong>${escapeHtml(params.archivoNombre)}</strong>, periodo <strong>${escapeHtml(params.periodo)}</strong>.</p>
  <table style="width:100%; border-collapse: collapse; margin: 1rem 0;">
    <thead>
      <tr style="background: #f0f0f0;">
        <th style="text-align:left; padding: 8px; border: 1px solid #ddd;">Negocio</th>
        <th style="text-align:right; padding: 8px; border: 1px solid #ddd;">Valor comisión</th>
        <th style="text-align:left; padding: 8px; border: 1px solid #ddd;">Categoría</th>
      </tr>
    </thead>
    <tbody>
${rows}
    </tbody>
  </table>
  <p style="color: #666; font-size: 0.9em;">Financieramente</p>
</body>
</html>`
}

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
}

function formatMoney(n: number): string {
	return new Intl.NumberFormat('es-EC', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 2,
	}).format(n)
}

/**
 * Envía un correo con el resumen de pre-liquidación a un usuario.
 */
export async function sendResumenPreliquidacionEmail(
	params: ResumenPreliquidacionEmailParams
): Promise<EmailResult> {
	const subject = `Resumen de pre-liquidación: ${params.archivoNombre} - ${params.periodo}`
	const html = buildResumenPreliquidacionHtml(params)
	return sendEmail({
		to: params.to,
		subject,
		html,
	})
}
