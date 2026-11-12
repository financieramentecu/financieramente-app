import { LEAD_OUTCOME_STATUS_LABELS } from '@/features/leads/lib/lead-outcome-status'
import { BOGOTA_TZ } from '@/features/shared/lib/bogota-date-range'
import type { LeadTableRow } from '@/features/leads/table/lead-table.types'

const BOM = '﻿'
const LINE_END = '\r\n'
const FORMULA_PREFIX = /^[=+\-@\t\r]/
const NEEDS_QUOTES = /[",\r\n]/

const bogotaDay = new Intl.DateTimeFormat('en-CA', {
	timeZone: BOGOTA_TZ,
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
})

/** `YYYY-MM-DD` of an instant in Bogotá. */
export function formatBogotaIsoDay(date: Date): string {
	return bogotaDay.format(date)
}

const COLUMNS: ReadonlyArray<readonly [string, (row: LeadTableRow) => string | number | null]> = [
	['ID', (row) => row.idLead],
	['Nombre', (row) => row.name],
	['Apellido', (row) => row.lastName],
	['Correo', (row) => row.email],
	['Teléfono', (row) => row.phone],
	['Origen', (row) => row.originTag],
	['Etapa', (row) => row.stageName],
	['Estado', (row) => LEAD_OUTCOME_STATUS_LABELS[row.outcomeStatus]],
	['Responsable', (row) => row.ownerName],
	['Valor estimado', (row) => row.estimatedValue],
	['Probabilidad (%)', (row) => row.probability],
	['Valor ponderado', (row) => row.weightedValue],
	['Etiquetas', (row) => row.tags.map((tag) => tag.name).join(' | ')],
	['Creado', (row) => bogotaDay.format(new Date(row.createdAt))],
	['Última actividad', (row) => (row.lastActivityAt ? bogotaDay.format(new Date(row.lastActivityAt)) : null)],
]

/**
 * RFC 4180 cell with a spreadsheet formula-injection guard: text starting
 * with `= + - @`, tab or CR is prefixed with `'` so Excel shows it as text.
 */
export function escapeCsvCell(value: string): string {
	const safe = FORMULA_PREFIX.test(value) ? `'${value}` : value
	return NEEDS_QUOTES.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe
}

function toCell(value: string | number | null): string {
	if (value === null || value === '') return ''
	return typeof value === 'number' ? String(value) : escapeCsvCell(value)
}

/** CSV export of the lead table: UTF-8 BOM (Excel), comma separator, CRLF, Bogotá dates. */
export function buildLeadTableCsv(rows: readonly LeadTableRow[]): string {
	const header = COLUMNS.map(([label]) => escapeCsvCell(label)).join(',')
	const lines = rows.map((row) => COLUMNS.map(([, read]) => toCell(read(row))).join(','))
	return BOM + [header, ...lines].join(LINE_END) + LINE_END
}
