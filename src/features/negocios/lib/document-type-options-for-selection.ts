import type { DocumentTypeOption } from '@/features/document-types/types/document-type.types'

/**
 * Active catalog options, plus the type already stored on the record
 * when that type was later deactivated.
 */
export function documentTypeOptionsForSelection(
	options: readonly DocumentTypeOption[],
	selectedCode: string | null | undefined
): DocumentTypeOption[] {
	const selected = selectedCode?.trim().toUpperCase() ?? ''
	return options.filter(
		(option) => option.status || option.code.toUpperCase() === selected
	)
}
