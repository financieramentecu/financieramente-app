/**
 * Export Excel H5 — cabeceras y filas. Inventario PII / §4.5: ver
 * `openspec/changes/h5-reporte-excel-negocios/design.md` (sin recortes hasta sign-off).
 */
import type { LeaderExportLevel } from './resolve-leader-chain-export'
import type { BusinessExportPayload } from './business-export-include'

export const PERIODICIDAD_ANUAL_NAME = 'Anual'

/** Columna monetaria — misma cadena en cabecera y en `route.ts` para formato Excel */
export const NEGOCIOS_EXPORT_VALOR_COLUMN = 'Valor de Negocio'

const TERM_CAP = 25

function fmtDate(iso: Date | string | null | undefined): string {
	if (!iso) {
		return ''
	}
	try {
		const d = typeof iso === 'string' ? new Date(iso) : iso
		return d.toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })
	} catch {
		const d = typeof iso === 'string' ? new Date(iso) : iso
		if (!(d instanceof Date) || isNaN(d.getTime())) return ''
		return d.toISOString().slice(0, 10)
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
	maxAnnualCols: number,
	dateFrom?: Date | null,
	dateTo?: Date | null
): string[] {
	const base: string[] = []
	if (dateFrom || dateTo) {
		base.push('Fecha inicial fondeo', 'Fecha final fondeo')
	}
	base.push(
		'Agente',
		'Nombres y Apellidos del Cliente',
		'Número de Cédula',
		'Correo Electrónico',
		'Teléfono',
		'Origen del cliente',
		'Compañía',
		'Plazo',
		'Producto',
		'Número de Contrato',
		'Moneda',
		NEGOCIOS_EXPORT_VALOR_COLUMN,
		'Periodicidad del pago',
		'Líder Encargado',
		'Categoría Líder',
		'Estado de negocio',
		'Fecha de Creación',
		'Fecha de Emisión',
		'Fecha de Fondeo'
	)

	for (let i = 1; i < maxLeaderLevels; i++) {
		base.push(`Líder ${i + 1} nombre`, `Líder ${i + 1} categoría`)
	}

	for (let i = 1; i <= maxAnnualCols; i++) {
		base.push(`Fecha Fondeo Anualidad ${i}`)
	}

	return base
}

export function mapBusinessToExportRow(
	b: BusinessExportPayload,
	leaders: LeaderExportLevel[],
	maxLeaderLevels: number,
	maxAnnualCols: number,
	dateFrom?: Date | null,
	dateTo?: Date | null
): Record<string, string | number | null> {
	const agentName = [b.user.name, b.user.lastName]
		.filter(Boolean)
		.join(' ')
		.trim()
	const clientName = [b.client.name, b.client.lastName]
		.filter(Boolean)
		.join(' ')
		.trim()
	const product = b.productPercentageCommission.productConfiguration.product

	const row: Record<string, string | number | null> = {}
	if (dateFrom || dateTo) {
		row['Fecha inicial fondeo'] = fmtDate(dateFrom)
		row['Fecha final fondeo'] = fmtDate(dateTo)
	}

	row['Agente'] = agentName
	row['Nombres y Apellidos del Cliente'] = clientName
	row['Número de Cédula'] = b.client.identityNumber ?? ''
	row['Correo Electrónico'] = b.client.email ?? ''
	row['Teléfono'] = b.client.phone ?? ''
	row['Origen del cliente'] = b.clientOrigin.name
	row['Compañía'] = product.company.name
	row['Plazo'] = b.term ?? ''
	row['Producto'] = product.name
	row['Número de Contrato'] = b.contract ?? ''
	row['Moneda'] = b.currency.name
	row[NEGOCIOS_EXPORT_VALOR_COLUMN] = Number(b.value)
	row['Periodicidad del pago'] = b.buyPeriodicity?.name ?? ''
	row['Líder Encargado'] = leaders[0]?.fullName ?? ''
	row['Categoría Líder'] = leaders[0]?.categoryName ?? ''
	row['Estado de negocio'] = b.status ?? ''
	row['Fecha de Creación'] = fmtDate(b.createdAt)
	row['Fecha de Emisión'] = fmtDate(b.dateIssued ?? null)
	row['Fecha de Fondeo'] = fmtDate(b.dateAnchored ?? null)

	for (let i = 1; i < maxLeaderLevels; i++) {
		const lvl = leaders[i]
		row[`Líder ${i + 1} nombre`] = lvl?.fullName ?? ''
		row[`Líder ${i + 1} categoría`] = lvl?.categoryName ?? ''
	}

	const isAnual = b.buyPeriodicity?.name === PERIODICIDAD_ANUAL_NAME
	for (let i = 1; i <= maxAnnualCols; i++) {
		const key = `Fecha Fondeo Anualidad ${i}`
		if (!isAnual || (b.term != null && i > b.term)) {
			row[key] = ''
			continue
		}
		const ap = b.payments.find((a) => a.installmentIndex === i)
		row[key] = fmtDate(ap?.dateAnchored ?? null)
	}

	return row
}

export function businessesToExportRows(
	businesses: BusinessExportPayload[],
	leaderChains: Map<number, LeaderExportLevel[]>,
	maxAnnualCols: number,
	maxLeaderLevels: number,
	dateFrom?: Date | null,
	dateTo?: Date | null
): Record<string, string | number | null>[] {
	return businesses.map((b) =>
		mapBusinessToExportRow(
			b,
			leaderChains.get(b.user.idUser) ?? [],
			maxLeaderLevels,
			maxAnnualCols,
			dateFrom,
			dateTo
		)
	)
}
