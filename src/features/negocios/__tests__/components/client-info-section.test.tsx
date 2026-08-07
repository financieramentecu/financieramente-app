import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
	businessFormSchema,
	type BusinessFormData,
} from '@/features/negocios/lib/business-form-schemas'
import { ClientInfoSection } from '@/features/negocios/components/sections/client-info-section'

function Wrapper({
	isLeadConversion,
	isBlocked = false,
}: {
	isLeadConversion: boolean
	isBlocked?: boolean
}) {
	const form = useForm<BusinessFormData>({
		resolver: zodResolver(businessFormSchema),
		defaultValues: {
			email: 'lead@example.com',
			name: 'Juan',
			lastNames: 'Pérez',
			phone: '3001234567',
			identityNumber: '',
			clientOrigin: '1',
			company: '',
			producto: '',
			terms: undefined,
			currency: '',
			periodicity: '',
			value: undefined,
			agent: '',
		},
	})

	return (
		<ClientInfoSection
			form={form}
			clientOriginsOptions={[{ value: '1', label: 'Origen' }]}
			clientResults={[]}
			onSearchClient={vi.fn().mockResolvedValue([])}
			onClientSelected={vi.fn()}
			isEditMode={false}
			isBlocked={isBlocked}
			isLeadConversion={isLeadConversion}
			getFieldPermission={() => ({
				readonly: false,
				disabled: false,
				hidden: false,
			})}
		/>
	)
}

async function typeNewDocumentAndCreate(documentNumber: string) {
	const documentCombobox = screen
		.getAllByRole('combobox')
		.find((el) => el.getAttribute('aria-labelledby') === 'numeroDocumento-label')
	if (!documentCombobox) throw new Error('Document combobox not found')
	fireEvent.click(documentCombobox)
	const input = await screen.findByPlaceholderText('Buscar cliente por documento...')
	fireEvent.change(input, { target: { value: documentNumber } })

	await waitFor(() => {
		expect(
			screen.getByText(`Crear nuevo cliente: ${documentNumber}`)
		).toBeInTheDocument()
	})
	fireEvent.click(screen.getByText(`Crear nuevo cliente: ${documentNumber}`))
}

describe('ClientInfoSection — "Crear nuevo" prefilled-data preservation', () => {
	it('does NOT clear prefilled contact fields when converting a lead (isLeadConversion=true)', async () => {
		render(<Wrapper isLeadConversion />)

		await typeNewDocumentAndCreate('99999999')

		await waitFor(() => {
			expect(screen.getByDisplayValue('lead@example.com')).toBeInTheDocument()
		})
		expect(screen.getByDisplayValue('Juan')).toBeInTheDocument()
		expect(screen.getByDisplayValue('Pérez')).toBeInTheDocument()
		expect(screen.getByDisplayValue('3001234567')).toBeInTheDocument()
	})

	it('still clears contact fields for the manual (non-lead) create flow, unchanged from current behavior', async () => {
		render(<Wrapper isLeadConversion={false} />)

		await typeNewDocumentAndCreate('99999999')

		await waitFor(() => {
			expect(screen.queryByDisplayValue('lead@example.com')).not.toBeInTheDocument()
		})
		expect(screen.queryByDisplayValue('Juan')).not.toBeInTheDocument()
		expect(screen.queryByDisplayValue('Pérez')).not.toBeInTheDocument()
		expect(screen.queryByDisplayValue('3001234567')).not.toBeInTheDocument()
	})
})
