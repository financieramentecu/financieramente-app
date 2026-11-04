import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DocumentTypesAdmin } from '@/features/document-types/components/document-types-admin'

vi.mock('@/features/shared/layout/DashboardLayout', () => ({
	DashboardLayout: ({ children }: { children: ReactNode }) => (
		<div>{children}</div>
	),
}))

vi.mock('@/features/document-types/hooks/use-document-type-mutations', () => ({
	useDocumentTypeMutations: () => ({
		createDocumentType: vi.fn(),
		updateDocumentType: vi.fn(),
		isSubmitting: false,
	}),
}))

vi.mock('@/features/document-types/hooks/use-document-types', () => ({
	useDocumentTypes: () => ({
		documentTypes: [
			{
				idDocumentType: 1,
				name: 'Cédula de Ciudadanía',
				code: 'CC',
				dataType: 'NUMERIC',
				minLength: 6,
				maxLength: 10,
				status: true,
				codeInUse: true,
				createdAt: '2026-01-01T00:00:00.000Z',
				updatedAt: '2026-01-01T00:00:00.000Z',
			},
			{
				idDocumentType: 2,
				name: 'Pasaporte diplomático',
				code: 'PD',
				dataType: 'ALPHANUMERIC',
				minLength: 6,
				maxLength: 12,
				status: true,
				codeInUse: false,
				createdAt: '2026-01-01T00:00:00.000Z',
				updatedAt: '2026-01-01T00:00:00.000Z',
			},
		],
		isLoading: false,
		refresh: vi.fn(),
	}),
}))

describe('DocumentTypesAdmin code lock', () => {
	it('disables the abbreviation when clients or users already store it', async () => {
		const user = userEvent.setup()
		render(<DocumentTypesAdmin />)

		await user.click(
			screen.getByRole('button', { name: 'Editar Cédula de Ciudadanía' })
		)

		expect(screen.getByLabelText(/Abreviatura/)).toBeDisabled()
		expect(
			screen.getByText(/no se puede cambiar porque ya está asignada/)
		).toBeInTheDocument()
	})

	it('keeps the abbreviation editable when nothing stores it', async () => {
		const user = userEvent.setup()
		render(<DocumentTypesAdmin />)

		await user.click(
			screen.getByRole('button', { name: 'Editar Pasaporte diplomático' })
		)

		expect(screen.getByLabelText(/Abreviatura/)).toBeEnabled()
	})
})
