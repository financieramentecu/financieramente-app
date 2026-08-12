/**
 * Thin HTTP client for Producción Real report APIs (hooks in batch 6.x).
 */

import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type {
	CurrencyMode,
	ProduccionRealContributionType,
	ProduccionRealDetailCursor,
	ProduccionRealDetailPage,
	ProduccionRealDetailRow,
	ProduccionRealKpis,
} from '../types/produccion-real.types'
import {
	decodeDetailCursor,
	encodeDetailCursor,
} from './produccion-real-schemas'

export interface FetchProduccionRealParams {
	readonly dateFrom: string
	readonly dateTo: string
	readonly contributionTypes?: readonly ProduccionRealContributionType[]
	readonly companyIds?: readonly number[]
	readonly currencyMode: CurrencyMode
	readonly userIds: readonly number[]
	readonly trmRate?: number | null
	/** Opaque cursor from previous page (`nextCursor` string) or structured cursor. */
	readonly cursor?: ProduccionRealDetailCursor | string | null
	readonly limit?: number
}

/** Wire shape returned by GET /detail (cursor is base64url-encoded). */
export interface ProduccionRealDetailApiPage {
	readonly rows: readonly ProduccionRealDetailRow[]
	readonly nextCursor: string | null
	readonly hasMore: boolean
}

function buildSearchParams(params: FetchProduccionRealParams): URLSearchParams {
	const sp = new URLSearchParams({
		dateFrom: params.dateFrom,
		dateTo: params.dateTo,
		currencyMode: params.currencyMode,
		userIds: params.userIds.join(','),
	})

	if (params.contributionTypes && params.contributionTypes.length > 0) {
		sp.set('contributionTypes', params.contributionTypes.join(','))
	}
	if (params.companyIds && params.companyIds.length > 0) {
		sp.set('companyIds', params.companyIds.join(','))
	}
	if (params.trmRate != null && params.trmRate > 0) {
		sp.set('trmRate', String(params.trmRate))
	}
	if (params.cursor) {
		const encoded =
			typeof params.cursor === 'string'
				? params.cursor
				: encodeDetailCursor(params.cursor)
		sp.set('cursor', encoded)
	}
	if (params.limit != null) {
		sp.set('limit', String(params.limit))
	}

	return sp
}

async function parseApiResponse<T>(res: Response): Promise<T> {
	const json = (await res.json()) as ApiResponse<T>
	if (!res.ok || json.data === null) {
		const error =
			json && 'error' in json && typeof json.error === 'string'
				? json.error
				: 'Error al consultar el reporte'
		throw new Error(error)
	}
	return json.data
}

export async function fetchProduccionRealKpis(
	params: FetchProduccionRealParams
): Promise<ProduccionRealKpis> {
	const sp = buildSearchParams(params)
	const res = await fetch(`/api/reports/produccion-real/kpis?${sp.toString()}`)
	return parseApiResponse<ProduccionRealKpis>(res)
}

/**
 * Fetches a detail page. Prefer `nextCursor` string for infinite scroll.
 */
export async function fetchProduccionRealDetail(
	params: FetchProduccionRealParams
): Promise<ProduccionRealDetailApiPage> {
	const sp = buildSearchParams(params)
	const res = await fetch(
		`/api/reports/produccion-real/detail?${sp.toString()}`
	)
	return parseApiResponse<ProduccionRealDetailApiPage>(res)
}

/** Optional helper: decode API page into domain DTO with structured cursor. */
export function toDetailPage(
	apiPage: ProduccionRealDetailApiPage
): ProduccionRealDetailPage {
	return {
		rows: apiPage.rows,
		nextCursor: decodeDetailCursor(apiPage.nextCursor),
		hasMore: apiPage.hasMore,
	}
}

export type ExportProduccionRealResult =
	| { ok: true; fileName: string }
	| { ok: false; error: string }

/**
 * POST export → download blob via temporary anchor (same pattern as negocios).
 */
export async function exportProduccionRealExcel(
	params: FetchProduccionRealParams
): Promise<ExportProduccionRealResult> {
	try {
		const response = await fetch('/api/reports/produccion-real/export', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				dateFrom: params.dateFrom,
				dateTo: params.dateTo,
				contributionTypes: params.contributionTypes ?? [],
				companyIds: params.companyIds ?? [],
				currencyMode: params.currencyMode,
				userIds: [...params.userIds],
				trmRate: params.trmRate ?? null,
			}),
		})

		if (!response.ok) {
			const contentType = response.headers.get('content-type')
			const errPayload =
				contentType?.includes('application/json')
					? await response.json().catch(() => ({
							error: `Error ${response.status}`,
						}))
					: { error: `Error ${response.status}` }
			const msg =
				typeof errPayload === 'object' &&
				errPayload !== null &&
				'error' in errPayload &&
				typeof (errPayload as { error: unknown }).error === 'string'
					? (errPayload as { error: string }).error
					: 'Error al exportar'
			return { ok: false, error: msg }
		}

		const blob = await response.blob()
		const url = window.URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		const cd = response.headers.get('Content-Disposition')
		const match = cd?.match(/filename="([^"]+)"/)
		const fileName =
			match?.[1] ??
			`produccion_real_${new Date().toISOString().split('T')[0]}.xlsx`
		a.download = fileName
		document.body.appendChild(a)
		a.click()
		window.URL.revokeObjectURL(url)
		document.body.removeChild(a)
		return { ok: true, fileName }
	} catch (error) {
		return {
			ok: false,
			error:
				error instanceof Error
					? error.message
					: 'Error al exportar Excel',
		}
	}
}
