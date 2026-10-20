import { prisma } from '@/lib/prisma'
import {
	fractionToPercent,
	percentToFraction,
	validateDefaultDistributionUpdate,
	type DefaultDistributionUpdateLine,
} from '@/features/distribution-commission/lib/default-distribution-update'
import type {
	DefaultDistributionGroupView,
	DefaultDistributionLineView,
} from '@/features/distribution-commission/types/default-distribution.types'

export async function listDefaultDistribution(): Promise<
	readonly DefaultDistributionGroupView[]
> {
	const rows = await prisma.defaultDistributionPercentage.findMany({
		include: {
			configLevel: { select: { code: true, name: true } },
			receiverLevel: { select: { code: true, name: true } },
		},
		orderBy: [{ idConfigLevel: 'asc' }, { id: 'asc' }],
	})

	const groups = new Map<string, DefaultDistributionGroupView>()
	for (const row of rows) {
		const existing = groups.get(row.configLevel.code)
		const line: DefaultDistributionLineView = {
			id: row.id,
			receiverLevelCode: row.receiverLevel.code,
			receiverLevelName: row.receiverLevel.name,
			percentage: fractionToPercent(Number(row.percentage.toString())),
		}
		if (existing) {
			groups.set(row.configLevel.code, {
				...existing,
				lines: [...existing.lines, line],
			})
			continue
		}
		groups.set(row.configLevel.code, {
			configLevelCode: row.configLevel.code,
			configLevelName: row.configLevel.name,
			lines: [line],
		})
	}

	return [...groups.values()]
}

export async function updateDefaultDistribution(
	updates: readonly DefaultDistributionUpdateLine[]
): Promise<readonly DefaultDistributionGroupView[]> {
	const current = await listDefaultDistribution()
	validateDefaultDistributionUpdate(
		current.flatMap((group) =>
			group.lines.map((line) => ({
				id: line.id,
				configLevelCode: group.configLevelCode,
				percentage: line.percentage,
			}))
		),
		updates
	)

	await prisma.$transaction(
		updates.map((line) =>
			prisma.defaultDistributionPercentage.update({
				where: { id: line.id },
				data: { percentage: percentToFraction(line.percentage) },
			})
		)
	)

	return listDefaultDistribution()
}
