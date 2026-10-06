/**
 * Business leadership-route table, stored as fractions (0.0085 = 0.85%).
 *
 * These literals are the expected values. They must not be imported from the
 * production constant, so a silent edit of that constant fails the tests.
 *
 * Persisted: every receiver line below, including the highlighted own share
 * (60%, 60.85%, 62.55%, 65.10%, 68.50%, 77%).
 *
 * Not persisted:
 * - "Override 17%" is the sum of the five LEVEL_0 upline lines
 *   (0.85 + 1.70 + 2.55 + 3.40 + 8.50). It is not its own row.
 * - The 77% printed under each column of the business sheet is the sum of
 *   that column's persisted lines, not a stored total.
 */
export const LEADERSHIP_ROUTE_DISTRIBUTION = {
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
} as const
