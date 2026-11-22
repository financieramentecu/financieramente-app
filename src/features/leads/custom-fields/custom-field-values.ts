import type {
	CustomFieldDefinition,
	CustomFieldPatch,
	CustomFieldValue,
	CustomFieldValues,
} from '@/features/leads/custom-fields/custom-field.types'

const MAX_TEXT_LENGTH = 500
const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/

type FieldCheck = { ok: true; value: CustomFieldValue | null } | { ok: false; error: string }

function isCalendarDay(value: string): boolean {
	const match = ISO_DAY.exec(value)
	if (!match) return false
	const [year, month, day] = match.slice(1).map(Number)
	const date = new Date(Date.UTC(year, month - 1, day))
	return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

function checkValue(definition: CustomFieldDefinition, raw: unknown): FieldCheck {
	const fail = (reason: string): FieldCheck => ({ ok: false, error: `${definition.label}: ${reason}` })
	if (raw === null) return { ok: true, value: null }
	switch (definition.type) {
		case 'TEXT': {
			if (typeof raw !== 'string') return fail('debe ser texto')
			const text = raw.trim()
			if (text.length > MAX_TEXT_LENGTH) return fail(`máximo ${MAX_TEXT_LENGTH} caracteres`)
			return { ok: true, value: text === '' ? null : text }
		}
		case 'NUMBER':
			return typeof raw === 'number' && Number.isFinite(raw) ? { ok: true, value: raw } : fail('debe ser un número')
		case 'DATE':
			return typeof raw === 'string' && isCalendarDay(raw) ? { ok: true, value: raw } : fail('fecha inválida')
		case 'SELECT':
			return typeof raw === 'string' && definition.options.includes(raw) ? { ok: true, value: raw } : fail('opción inválida')
	}
}

/** Validates a client patch against the active definitions; unknown keys are rejected. */
export function validateCustomFieldPatch(
	definitions: readonly CustomFieldDefinition[],
	patch: Record<string, unknown>
): { ok: true; values: CustomFieldPatch } | { ok: false; error: string } {
	const byKey = new Map(definitions.map((definition) => [definition.key, definition]))
	const values: CustomFieldPatch = {}
	for (const [key, raw] of Object.entries(patch)) {
		const definition = byKey.get(key)
		if (!definition) return { ok: false, error: `Campo desconocido: ${key}` }
		const checked = checkValue(definition, raw)
		if (!checked.ok) return checked
		values[key] = checked.value
	}
	return { ok: true, values }
}

function asValues(stored: unknown): CustomFieldValues {
	if (typeof stored !== 'object' || stored === null || Array.isArray(stored)) return {}
	return stored as CustomFieldValues
}

/** Applies a validated patch to the stored JSON: `null` removes the key, other keys are kept. */
export function mergeCustomFieldValues(stored: unknown, patch: CustomFieldPatch): CustomFieldValues {
	const merged: CustomFieldValues = { ...asValues(stored) }
	for (const [key, value] of Object.entries(patch)) {
		if (value === null) delete merged[key]
		else merged[key] = value
	}
	return merged
}

/** Stored values limited to the active definitions (deactivated fields stay stored but hidden). */
export function pickVisibleCustomFieldValues(
	stored: unknown,
	definitions: readonly CustomFieldDefinition[]
): CustomFieldValues {
	const values = asValues(stored)
	const visible: CustomFieldValues = {}
	for (const { key } of definitions) {
		if (key in values) visible[key] = values[key]
	}
	return visible
}
