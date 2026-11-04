import { render, screen } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { describe, expect, it, vi } from 'vitest'
import type { BusinessFormData } from '@/features/negocios/lib/business-form-schemas'
import { PolicyholderSection } from '../policyholder-section'

const FIELD_LABELS = [
	'Nro. de Documento',
	'Tipo de Documento',
	'Email',
	'Apellidos',
	'Nombres',
	'Teléfono',
] as const

describe('PolicyholderSection field order', () => {
	it('lists the document number before the document type, matching the client section', () => {
		function Wrapper() {
			const form = useForm<BusinessFormData>({
				defaultValues: {
					policyholderIdentityNumber: '',
					policyholderTypeIdentity: '',
				} as BusinessFormData,
			})

			return (
				<PolicyholderSection
					form={form}
					documentTypeOptions={[]}
					results={[]}
					isSearching={false}
					onQueryChange={vi.fn()}
					isBlocked={false}
					getFieldPermission={() => ({
						readonly: false,
						disabled: false,
						hidden: false,
					})}
				/>
			)
		}

		render(<Wrapper />)

		const labels = FIELD_LABELS.map((label) => screen.getByText(label))
		for (let index = 0; index < labels.length - 1; index += 1) {
			expect(
				labels[index].compareDocumentPosition(labels[index + 1]) &
					Node.DOCUMENT_POSITION_FOLLOWING
			).toBeTruthy()
		}
	})
})
