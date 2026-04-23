/**
 * Export Excel H5 — cabeceras y filas. Inventario PII / §4.5: ver
 * `openspec/changes/h5-reporte-excel-negocios/design.md` (sin recortes hasta sign-off).
 */
import type { LeaderExportLevel } from './resolve-leader-chain-export'
import type { BusinessExportPayload } from './business-export-include'

export const PERIODICIDAD_ANUAL_NAME = 'Anual'

const MONTH_NAMES = [
	'Enero',
	'Febrero',
	'Marzo',
	'Abril',
	'Mayo',
	'Junio',
	'Julio',
	'Agosto',
	'Septiembre',
	'Octubre',
	'Noviembre',
	'Diciembre',
]

const TERM_CAP = 25

function fmtDate(iso: Date | null | undefined): string {
	if (!iso) {
		return ''
	}
	try {
		return iso.toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })
	} catch {
		return iso.toISOString().slice(0, 10)
	}
}

export function computeMaxAnnualColumns(rows: BusinessExportPayload[]): number {
	let maxTerm = 0
	for (const b of rows) {
		if (b.buyPeriodicity?.name !== PERIODICIDAD_ANUAL_NAME) {
			continue
		}
		const t = b.term ?? 0
		if (t > maxTerm) {
			maxTerm = t
		}
	}
	return Math.min(Math.max(maxTerm, 0), TERM_CAP)
}

export function computeMaxLeaderLevels(chains: LeaderExportLevel[][]): number {
	if (chains.length === 0) {
		return 0
	}
	const m = Math.max(...chains.map((c) => c.length))
	return Math.min(m, 50)
}

/**
 * Orden exacto de columnas del Excel (JSON → sheet).
 * Debe coincidir con las claves que genera {@link mapBusinessToExportRow}.
 */
export function negociosExportColumnHeaders(
	maxLeaderLevels: number,
	maxAnnualCols: number
): string[] {
	const base: string[] = [
		'Agente',
		'Nombres y Apellidos del Cliente',
		'Cedula del cliente',
		'Origen del cliente',
		'Email Cliente',
		'Compañía',
		'Plazo',
		'Periodicidad',
		'Es anualidad',
		'Producto',
		'Número de contrato',
		'Moneda',
		'Valor negocio',
		'Líder encargado',
		'Categoría líder',
		'Estado del negocio',
		'Fecha de emisión',
		'Fecha de fondeo',
		'Fecha de creación',
	]
	
	// Si hay más niveles de líderes (el primero ya está como Líder encargado)
	for (let i = 1; i < maxLeaderLevels; i++) {
		base.push(`Líder ${i + 1} nombre`, `Líder ${i + 1} categoría`)
	}

	for (let i = 1; i <= maxAnnualCols; i++) {
		base.push(`Fecha fondeo anualidad ${i}`)
	}

	base.push('Mes', 'Año')
	
	return base
}

export function mapBusinessToExportRow(
	b: BusinessExportPayload,
	leaders: LeaderExportLevel[],
	maxLeaderLevels: number,
	maxAnnualCols: number
): Record<string, string | number | null> {
	const agentName = [b.user.name, b.user.lastName].filter(Boolean).join(' ').trim()
	const clientName = [b.client.name, b.client.lastName].filter(Boolean).join(' ').trim()
	const product = b.productPercentageCommission.productConfiguration.product
	
	// Cálculo de Mes y Año (de la fecha de emisión preferiblemente)
	const dateForPeriod = b.dateIssued || b.createdAt
	const mesIndex = dateForPeriod ? dateForPeriod.getMonth() : null
	const mesText = mesIndex !== null ? MONTH_NAMES[mesIndex] : ''
	const año = dateForPeriod ? dateForPeriod.getFullYear() : null

	const row: Record<string, string | number | null> = {
		'Agente': agentName,
		'Nombres y Apellidos del Cliente': clientName,
		'Cedula del cliente': b.client.identityNumber ?? '',
		'Origen del cliente': b.clientOrigin.name,
		'Email Cliente': b.client.email ?? '',
		'Compañía': product.company.name,
		'Plazo': b.term ?? '',
		'Periodicidad': b.buyPeriodicity?.name ?? '',
		'Es anualidad': b.annualPayments.length > 0 ? 'Sí' : 'No',
		'Producto': product.name,
		'Número de contrato': b.contract ?? '',
		'Moneda': b.currency.name,
		'Valor negocio': Number(b.value),
		'Líder encargado': leaders[0]?.fullName ?? '',
		'Categoría líder': leaders[0]?.categoryName ?? '',
		'Estado del negocio': b.status ?? '',
		'Fecha de emisión': fmtDate(b.dateIssued ?? null),
		'Fecha de fondeo': fmtDate(b.dateAnchored ?? null),
		'Fecha de creación': fmtDate(b.createdAt),
	}

	// Extras de líderes si existen
	for (let i = 1; i < maxLeaderLevels; i++) {
		const lvl = leaders[i]
		row[`Líder ${i + 1} nombre`] = lvl?.fullName ?? ''
		row[`Líder ${i + 1} categoría`] = lvl?.categoryName ?? ''
	}

	const isAnual = b.buyPeriodicity?.name === PERIODICIDAD_ANUAL_NAME
	for (let i = 1; i <= maxAnnualCols; i++) {
		const key = `Fecha fondeo anualidad ${i}`
		if (!isAnual || (b.term != null && i > b.term)) {
			row[key] = ''
			continue
		}
		const ap = b.annualPayments.find((a) => a.installmentIndex === i)
		row[key] = fmtDate(ap?.dateAnchored ?? null)
	}

	row['Mes'] = mesText
	row['Año'] = año

	return row
}

export function businessesToExportRows(
	businesses: BusinessExportPayload[],
	leaderChains: Map<number, LeaderExportLevel[]>,
	maxAnnualCols: number,
	maxLeaderLevels: number
): Record<string, string | number | null>[] {
	return businesses.map((b) =>
		mapBusinessToExportRow(
			b,
			leaderChains.get(b.user.idUser) ?? [],
			maxLeaderLevels,
			maxAnnualCols
		)
	)
}
