/**
 * Lead origin as the commercial team reads it: the CRM pipeline, with the
 * Money Flow pipeline split by launch (Money Flow 3 starts 7 Sep 2026).
 */

import { COMMERCIAL_DASHBOARD_UI } from './ui-copy'

const MONEY_FLOW_PIPELINE = 'Money Flow- Skool'
const MONEY_FLOW_3_START = Date.parse('2026-09-07T00:00:00-05:00')

export function originLabel(originTag: string | null | undefined, createdAt: Date): string {
	if (!originTag) return COMMERCIAL_DASHBOARD_UI.PIPELINE_NONE
	if (originTag !== MONEY_FLOW_PIPELINE) return originTag
	return createdAt.getTime() >= MONEY_FLOW_3_START
		? COMMERCIAL_DASHBOARD_UI.ORIGIN_MONEY_FLOW_3
		: COMMERCIAL_DASHBOARD_UI.ORIGIN_MONEY_FLOW_PREVIOUS
}

/** Monday (YYYY-MM-DD) of the Bogotá week that contains `date`. */
export function bogotaWeekStart(date: Date): string {
	const bogota = new Date(date.getTime() - 5 * 60 * 60 * 1000)
	const dayFromMonday = (bogota.getUTCDay() + 6) % 7
	bogota.setUTCDate(bogota.getUTCDate() - dayFromMonday)
	return bogota.toISOString().slice(0, 10)
}
