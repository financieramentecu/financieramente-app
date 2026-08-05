/**
 * Canonical form for `LeadFunnelColumn.externalStatusKey` and incoming
 * webhook `statusKey`: uppercase, spaces collapsed to a single underscore.
 * Applied on both sides so admin-authored keys and CRM/n8n-sent keys always
 * match regardless of case or spacing.
 */
export function normalizeFunnelStatusKey(value: string): string {
	return value.trim().toUpperCase().replace(/\s+/g, '_')
}
