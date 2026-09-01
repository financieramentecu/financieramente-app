/**
 * Thin HTTP client for ABA-MFUND report APIs.
 */

import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { BusinessStatus } from '@/features/negocios/types/business-entity.types'
import type {
	AbaMfundDetailApiPage,
	AbaMfundKpis,
	AbaMfundRanking,
} from '../types/aba-mfund.types'

export type { AbaMfundDetailApiPage }

export interface FetchAbaMfundParams {
	readonly dateFrom: string
	readonly dateTo: string
	readonly userIds: readonly number[]
	readonly statuses?: readonly BusinessStatus[]
	readonly cursor?: string | null
	readonly limit?: number
}

function buildSearchParams(params: FetchAbaMfundParams): URLSearchParams {
	const sp = new URLSearchParams({
		dateFrom: params.dateFrom,
		dateTo: params.dateTo,
		userIds: params.userIds.join(','),
	})

	if (params.statuses && params.statuses.length > 0) {
		sp.set('statuses', params.statuses.join(','))
	}
	if (params.cursor) {
		sp.set('cursor', params.cursor)
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

export async function fetchAbaMfundKpis(
	params: FetchAbaMfundParams
): Promise<AbaMfundKpis> {
	const sp = buildSearchParams(params)
	const res = await fetch(`/api/reports/aba-mfund/kpis?${sp.toString()}`)
	return parseApiResponse<AbaMfundKpis>(res)
}

export async function fetchAbaMfundRanking(
	params: FetchAbaMfundParams
): Promise<AbaMfundRanking> {
	const sp = buildSearchParams(params)
	const res = await fetch(`/api/reports/aba-mfund/ranking?${sp.toString()}`)
	return parseApiResponse<AbaMfundRanking>(res)
}

export async function fetchAbaMfundDetail(
	params: FetchAbaMfundParams
): Promise<AbaMfundDetailApiPage> {
	const sp = buildSearchParams(params)
	const res = await fetch(`/api/reports/aba-mfund/detail?${sp.toString()}`)
	return parseApiResponse<AbaMfundDetailApiPage>(res)
}

export type ExportAbaMfundResult =
	| { ok: true; fileName: string }
	| { ok: false; error: string }

/**
 * POST export → download blob via temporary anchor.
 */
export async function exportAbaMfundExcelClient(
	params: FetchAbaMfundParams
): Promise<ExportAbaMfundResult> {
	try {
		const response = await fetch('/api/reports/aba-mfund/export', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				dateFrom: params.dateFrom,
				dateTo: params.dateTo,
				userIds: [...params.userIds],
				statuses: [...(params.statuses ?? [])],
			}),
		})

		if (!response.ok) {
			const contentType = response.headers.get('content-type')
			const errPayload = contentType?.includes('application/json')
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
			`aba_mfund_${new Date().toISOString().split('T')[0]}.xlsx`
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
				error instanceof Error ? error.message : 'Error al exportar Excel',
		}
	}
}
