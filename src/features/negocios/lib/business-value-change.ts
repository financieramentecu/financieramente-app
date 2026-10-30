import { UserRole } from '@/features/auth/lib/roles'

type BusinessValueInput = number | string | { toString(): string } | null | undefined

export const BUSINESS_VALUE_CHANGE_CONFIRMATION =
	'¿Está seguro de cambiar el Valor de Negocio? Esta acción afectará futuros aportes y liquidaciones.'

const DECIMAL_MONEY_PATTERN = /^(-?)(\d+)(?:\.(\d+))?$/

/**
 * Converts a money amount to integer cents with half-up rounding to 2 decimal
 * places, matching PostgreSQL `numeric(15,2)`. Uses string decimal arithmetic
 * so values like `1.005` become 101 (1.01), not 100 (1.00) from float `* 100`.
 */
function toBusinessValueCents(value: BusinessValueInput): number | null {
	if (value === null || value === undefined || value === '') {
		return null
	}

	const raw = (typeof value === 'number' ? value.toString() : value.toString()).trim()
	if (raw === '') {
		return null
	}

	const match = DECIMAL_MONEY_PATTERN.exec(raw)
	if (!match) {
		return null
	}

	const sign = match[1] === '-' ? -1 : 1
	const integerPart = match[2]
	const fraction = match[3] ?? ''

	const tenths = Number(fraction[0] ?? '0')
	const hundredths = Number(fraction[1] ?? '0')
	const thirdDigit = fraction.length > 2 ? Number(fraction[2]) : 0
	const roundUp = thirdDigit >= 5

	let cents = Number(integerPart) * 100 + tenths * 10 + hundredths
	if (roundUp) {
		cents += 1
	}

	if (!Number.isFinite(cents)) {
		return null
	}

	return sign * cents
}

function formatCentsAsMoney(cents: number): string {
	const sign = cents < 0 ? '-' : ''
	const absolute = Math.abs(cents)
	const whole = Math.floor(absolute / 100)
	const fraction = String(absolute % 100).padStart(2, '0')
	return `${sign}${whole}.${fraction}`
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
	return formatCentsAsMoney(cents)
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
