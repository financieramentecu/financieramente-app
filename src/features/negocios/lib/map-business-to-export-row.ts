/**
 * Export Excel H5 — cabeceras y filas. Inventario PII / §4.5: ver
 * `openspec/changes/h5-reporte-excel-negocios/design.md` (sin recortes hasta sign-off).
 */
import type { LeaderExportLevel } from './resolve-leader-chain-export'
import type { BusinessExportPayload } from './business-export-include'

export const PERIODICIDAD_ANUAL_NAME = 'Anual'

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
		'ID negocio',
		'Contrato',
		'Estado',
		'Fecha creación',
		'Fecha emisión',
		'Fecha fondeo (negocio)',
		'Cliente',
		'Documento cliente',
		'Email cliente',
		'Compañía',
		'Producto',
		'Origen',
		'Valor',
		'Moneda',
		'Plazo',
		'Periodicidad',
		'Anualidades',
		'Coach',
		'Categoría coach',
	]
	for (let i = 0; i < maxLeaderLevels; i++) {
		base.push(`Líder ${i + 1} nombre`, `Líder ${i + 1} categoría`)
	}
	for (let i = 1; i <= maxAnnualCols; i++) {
		base.push(`Fecha fondeo anualidad ${i}`)
	}
	return base
}

export function mapBusinessToExportRow(
	b: BusinessExportPayload,
	leaders: LeaderExportLevel[],
	maxLeaderLevels: number,
	maxAnnualCols: number
): Record<string, string | number | null> {
	const coachName = [b.user.name, b.user.lastName].filter(Boolean).join(' ').trim()
	const product =
		b.productPercentageCommission.productConfiguration.product
	const row: Record<string, string | number | null> = {
		'ID negocio': b.idBusiness,
		Contrato: b.contract ?? '',
		Estado: b.status ?? '',
		'Fecha creación': fmtDate(b.createdAt),
		'Fecha emisión': fmtDate(b.dateIssued ?? null),
		'Fecha fondeo (negocio)': fmtDate(b.dateAnchored ?? null),
		Cliente: [b.client.name, b.client.lastName].filter(Boolean).join(' ').trim(),
		'Documento cliente': b.client.identityNumber ?? '',
		'Email cliente': b.client.email ?? '',
		Compañía: product.company.name,
		Producto: product.name,
		Origen: b.clientOrigin.name,
		Valor: Number(b.value),
		Moneda: b.currency.name,
		Plazo: b.term ?? '',
		Periodicidad: b.buyPeriodicity?.name ?? '',
		Anualidades:
			b.annualPayments.length > 0 ? 'Sí' : 'No',
		Coach: coachName,
		'Categoría coach': b.user.category?.name ?? '',
	}

	for (let i = 0; i < maxLeaderLevels; i++) {
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
