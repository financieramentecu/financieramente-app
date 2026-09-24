/**
 * Fixed 11-header CSV template for the leads import, in this exact order.
 * Shared by the template download route, the client-side header check
 * (`parseLeadCsvFile`), and the Zod row schema — a single source of truth so
 * the three never drift apart.
 *
 * `propietario_nombre` (Amendment A) is the 11th and last header: the
 * optional owner-name fallback used when `propietario_correo` is empty or
 * unmatched. The feature has not shipped, so there is no 10-header
 * compatibility path — a file missing this header is rejected whole-file by
 * `parseLeadCsvFile`.
 */
export const LEAD_CSV_HEADERS = [
	'id_externo_crm',
	'nombre',
	'apellido',
	'telefono',
	'correo',
	'columna_funnel',
	'estado',
	'fecha_creacion',
	'origen',
	'propietario_correo',
	'propietario_nombre',
] as const

export type LeadCsvHeader = (typeof LEAD_CSV_HEADERS)[number]

/**
 * Builds the downloadable template body: header line only, no data rows.
 */
export function buildLeadCsvTemplate(): string {
	return `${LEAD_CSV_HEADERS.join(',')}\n`
}
