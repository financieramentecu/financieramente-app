/**
 * Approved default commission distribution, stored as fractions (0.6 = 60%).
 * Source: docs/DISTRIBUTION_TABLE.md. GENERAL_LEVEL has no row in that table.
 *
 * Every entry is a persisted receiver line, including the highlighted own share
 * (LEVEL_1 60.85%, LEVEL_2 62.55%, LEVEL_3 65.10%, LEVEL_4 68.50%, LEVEL_5 77%).
 * "Override 17%" is not stored: it is the sum of the five LEVEL_0 upline lines.
 * The 77% column footer is the sum of that level's lines, not a stored total.
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
		{ receiverCode: 'LEVEL_1', percentage: 0.6085 },
	],
	LEVEL_2: [
		{ receiverCode: 'LEVEL_5', percentage: 0.0255 },
		{ receiverCode: 'LEVEL_4', percentage: 0.034 },
		{ receiverCode: 'LEVEL_3', percentage: 0.085 },
		{ receiverCode: 'LEVEL_2', percentage: 0.6255 },
	],
	LEVEL_3: [
		{ receiverCode: 'LEVEL_5', percentage: 0.034 },
		{ receiverCode: 'LEVEL_4', percentage: 0.085 },
		{ receiverCode: 'LEVEL_3', percentage: 0.651 },
	],
	LEVEL_4: [
		{ receiverCode: 'LEVEL_5', percentage: 0.085 },
		{ receiverCode: 'LEVEL_4', percentage: 0.685 },
	],
	LEVEL_5: [{ receiverCode: 'LEVEL_5', percentage: 0.77 }],
}

export function getDefaultDistributionRows(
	configLevelCode: string
): readonly DefaultDistributionRow[] | null {
	return DEFAULT_DISTRIBUTION_BY_CONFIG_LEVEL[configLevelCode] ?? null
}

export interface DefaultDistributionDbRow {
	readonly percentage?: { toString(): string } | number | string
	readonly receiverLevel?: { readonly code: string }
	readonly configLevel?: { readonly code: string }
}

export interface DefaultDistributionReader {
	defaultDistributionPercentage?: {
		findMany: (args?: object) => Promise<readonly DefaultDistributionDbRow[]>
	}
}

function toFraction(value: DefaultDistributionDbRow['percentage']): number {
	return Number(value ?? 0)
}

/**
 * Uses saved template rows when they exist. Falls back to the built-in table
 * when the template has not been stored yet.
 */
export async function resolveDefaultDistributionRows(
	db: DefaultDistributionReader,
	configLevelCode: string
): Promise<readonly DefaultDistributionRow[] | null> {
	const findMany = db.defaultDistributionPercentage?.findMany
	if (findMany) {
		const rows = await findMany({
			where: { configLevel: { code: configLevelCode } },
			select: {
				percentage: true,
				receiverLevel: { select: { code: true } },
			},
			orderBy: { id: 'asc' },
		})
		if (rows.length > 0) {
			return rows.map((row) => ({
				receiverCode: row.receiverLevel?.code ?? '',
				percentage: toFraction(row.percentage),
			}))
		}
	}

	return getDefaultDistributionRows(configLevelCode)
}

export async function loadConfiguredDefaultLevelCodes(
	db: DefaultDistributionReader
): Promise<ReadonlySet<string>> {
	const findMany = db.defaultDistributionPercentage?.findMany
	if (!findMany) {
		return new Set(Object.keys(DEFAULT_DISTRIBUTION_BY_CONFIG_LEVEL))
	}

	const rows = await findMany({
		distinct: ['idConfigLevel'],
		select: { configLevel: { select: { code: true } } },
	})
	if (rows.length === 0) {
		return new Set(Object.keys(DEFAULT_DISTRIBUTION_BY_CONFIG_LEVEL))
	}

	return new Set(
		rows
			.map((row) => row.configLevel?.code)
			.filter((code): code is string => Boolean(code))
	)
}

export class DefaultDistributionError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'DefaultDistributionError'
	}
}
