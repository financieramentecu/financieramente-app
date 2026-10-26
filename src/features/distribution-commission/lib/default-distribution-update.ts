import { z } from 'zod'

export class DefaultDistributionUpdateError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'DefaultDistributionUpdateError'
	}
}

export const updateDefaultDistributionSchema = z.object({
	lines: z
		.array(
			z.object({
				id: z.number().int().positive(),
				percentage: z.number().positive().max(100),
			})
		)
		.min(1),
})

export interface DefaultDistributionUpdateLine {
	readonly id: number
	readonly percentage: number
}

export interface CurrentDefaultDistributionLine {
	readonly id: number
	readonly configLevelCode: string
	readonly percentage: number
}

const SUM_EPSILON = 1e-6

export function validateDefaultDistributionUpdate(
	current: readonly CurrentDefaultDistributionLine[],
	updates: readonly DefaultDistributionUpdateLine[]
): void {
	if (current.length === 0) {
		throw new DefaultDistributionUpdateError(
			'No hay porcentajes por defecto guardados para editar'
		)
	}

	const updateById = new Map(updates.map((line) => [line.id, line.percentage]))
	if (updateById.size !== updates.length) {
		throw new DefaultDistributionUpdateError('Hay porcentajes repetidos')
	}

	const missing = current.filter((line) => !updateById.has(line.id))
	if (missing.length > 0 || updates.length !== current.length) {
		throw new DefaultDistributionUpdateError(
			'Debes enviar todos los porcentajes de la distribución por defecto'
		)
	}

	const unknown = updates.filter(
		(line) => !current.some((currentLine) => currentLine.id === line.id)
	)
	if (unknown.length > 0) {
		throw new DefaultDistributionUpdateError(
			'Hay porcentajes que no pertenecen a la distribución por defecto'
		)
	}

	const sums = new Map<string, number>()
	for (const line of current) {
		const percentage = updateById.get(line.id)
		if (percentage === undefined || percentage <= 0 || percentage > 100) {
			throw new DefaultDistributionUpdateError(
				'Cada porcentaje debe ser mayor que 0 y como máximo 100'
			)
		}
		sums.set(line.configLevelCode, (sums.get(line.configLevelCode) ?? 0) + percentage)
	}

	for (const [levelCode, sum] of sums) {
		if (sum > 100 + SUM_EPSILON) {
			throw new DefaultDistributionUpdateError(
				`La suma de ${levelCode} no puede superar 100`
			)
		}
	}
}

export function percentToFraction(percentage: number): number {
	return Math.round((percentage / 100) * 1_000_000) / 1_000_000
}

export function fractionToPercent(fraction: number): number {
	return Math.round(fraction * 100 * 10_000) / 10_000
}
