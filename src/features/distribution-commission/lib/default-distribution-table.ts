/**
 * Approved default commission distribution, stored as fractions (0.6 = 60%).
 * Source: docs/DISTRIBUTION_TABLE.md. GENERAL_LEVEL has no row in that table.
 */
export interface DefaultDistributionRow {
	readonly receiverCode: string
	readonly percentage: number
}

export const DEFAULT_DISTRIBUTION_BY_CONFIG_LEVEL: Readonly<
	Record<string, readonly DefaultDistributionRow[]>
> = {
	LEVEL_0: [
		{ receiverCode: 'LEVEL_5', percentage: 0.0085 },
		{ receiverCode: 'LEVEL_4', percentage: 0.017 },
		{ receiverCode: 'LEVEL_3', percentage: 0.0255 },
		{ receiverCode: 'LEVEL_2', percentage: 0.034 },
		{ receiverCode: 'LEVEL_1', percentage: 0.085 },
		{ receiverCode: 'LEVEL_0', percentage: 0.6 },
	],
	LEVEL_1: [
		{ receiverCode: 'LEVEL_5', percentage: 0.017 },
		{ receiverCode: 'LEVEL_4', percentage: 0.0255 },
		{ receiverCode: 'LEVEL_3', percentage: 0.034 },
		{ receiverCode: 'LEVEL_2', percentage: 0.085 },
		{ receiverCode: 'LEVEL_1', percentage: 0.6 },
	],
	LEVEL_2: [
		{ receiverCode: 'LEVEL_5', percentage: 0.0255 },
		{ receiverCode: 'LEVEL_4', percentage: 0.034 },
		{ receiverCode: 'LEVEL_3', percentage: 0.085 },
		{ receiverCode: 'LEVEL_2', percentage: 0.6 },
	],
	LEVEL_3: [
		{ receiverCode: 'LEVEL_5', percentage: 0.034 },
		{ receiverCode: 'LEVEL_4', percentage: 0.085 },
		{ receiverCode: 'LEVEL_3', percentage: 0.6 },
	],
	LEVEL_4: [
		{ receiverCode: 'LEVEL_5', percentage: 0.085 },
		{ receiverCode: 'LEVEL_4', percentage: 0.6 },
	],
	LEVEL_5: [{ receiverCode: 'LEVEL_5', percentage: 0.6 }],
}

export function getDefaultDistributionRows(
	configLevelCode: string
): readonly DefaultDistributionRow[] | null {
	return DEFAULT_DISTRIBUTION_BY_CONFIG_LEVEL[configLevelCode] ?? null
}

export class DefaultDistributionError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'DefaultDistributionError'
	}
}
