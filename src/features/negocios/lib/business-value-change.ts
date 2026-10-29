import { UserRole } from '@/features/auth/lib/roles'

type BusinessValueInput = number | string | { toString(): string } | null | undefined

export const BUSINESS_VALUE_CHANGE_CONFIRMATION =
	'¿Está seguro de cambiar el Valor de Negocio? Esta acción afectará futuros aportes y liquidaciones.'

function toBusinessValueCents(value: BusinessValueInput): number | null {
	if (value === null || value === undefined || value === '') {
		return null
	}

	const raw = typeof value === 'number' ? value.toString() : value.toString().trim()
	if (raw === '') {
		return null
	}

	const numeric = Number(raw)
	if (!Number.isFinite(numeric)) {
		return null
	}

	return Math.round(numeric * 100)
}

export function businessValuesDiffer(
	previousValue: BusinessValueInput,
	nextValue: BusinessValueInput
): boolean {
	return toBusinessValueCents(previousValue) !== toBusinessValueCents(nextValue)
}

export function shouldConfirmSupportAnalystBusinessValueChange(input: {
	roleCode: string | null | undefined
	previousValue: BusinessValueInput
	nextValue: BusinessValueInput
}): boolean {
	return (
		input.roleCode === UserRole.ANALISTA_SOPORTE &&
		businessValuesDiffer(input.previousValue, input.nextValue)
	)
}

export interface BusinessValueChangeAudit {
	businessId: number
	userId: number
	email: string
	previousValue: string
	newValue: string
	changedAt: string
}

function formatBusinessValue(value: BusinessValueInput): string {
	const cents = toBusinessValueCents(value)
	if (cents === null) {
		return ''
	}
	return (cents / 100).toFixed(2)
}

export function buildBusinessValueChangeAudit(input: {
	businessId: number
	userId: number
	email: string
	previousValue: BusinessValueInput
	newValue: BusinessValueInput
	changedAt: Date
}): BusinessValueChangeAudit {
	return {
		businessId: input.businessId,
		userId: input.userId,
		email: input.email,
		previousValue: formatBusinessValue(input.previousValue),
		newValue: formatBusinessValue(input.newValue),
		changedAt: input.changedAt.toISOString(),
	}
}
