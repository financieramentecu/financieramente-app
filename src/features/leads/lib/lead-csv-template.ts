/** Legacy 11-column order remains valid; new templates append optional attribution. */
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

export const LEAD_CSV_ATTRIBUTION_HEADERS = [
	'id_captura',
	'referido_por',
] as const
export const LEAD_CSV_FULL_HEADERS = [
	...LEAD_CSV_HEADERS,
	...LEAD_CSV_ATTRIBUTION_HEADERS,
] as const

export type LeadCsvHeader = (typeof LEAD_CSV_HEADERS)[number]

/**
 * Builds the downloadable template body: header line only, no data rows.
 */
export function buildLeadCsvTemplate(): string {
	return `${LEAD_CSV_FULL_HEADERS.join(',')}\n`
}
