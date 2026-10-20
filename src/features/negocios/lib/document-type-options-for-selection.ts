import type { DocumentTypeOption } from '@/features/document-types/types/document-type.types'

const MISSING_CATALOG_TYPE_LIMITS = {
	minLength: 1,
	maxLength: 20,
} as const

function trimCode(code: string | null | undefined): string {
	return code?.trim() ?? ''
}

function normalizeCode(code: string | null | undefined): string {
	return trimCode(code).toUpperCase()
}

/**
 * Active catalog options, plus the type already stored on the record.
 * When the stored type was later deactivated it stays listed. When the
 * stored code has no catalog row at all, it is listed as an inactive option
 * so the select can still display it.
 */
export function documentTypeOptionsForSelection(
	options: readonly DocumentTypeOption[],
	selectedCode: string | null | undefined
): DocumentTypeOption[] {
	const storedCode = trimCode(selectedCode)
	const selected = storedCode.toUpperCase()
	const visible = options.filter(
		(option) => option.status || normalizeCode(option.code) === selected
	)

	const isListed = visible.some(
		(option) => normalizeCode(option.code) === selected
	)
	if (!selected || isListed) {
		return visible
	}

	return [
		...visible,
		{
			code: storedCode,
			name: storedCode,
			dataType: 'ALPHANUMERIC',
			...MISSING_CATALOG_TYPE_LIMITS,
			status: false,
		},
	]
}
