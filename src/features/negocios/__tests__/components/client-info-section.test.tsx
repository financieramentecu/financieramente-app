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
			typeIdentity: '',
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

describe('ClientInfoSection — Tipo de Documento', () => {
	it('shows the field and hides inactive types that are not already selected', async () => {
		function Form() {
			const form = useForm<BusinessFormData>({
				resolver: zodResolver(businessFormSchema),
				defaultValues: {
					email: '',
					name: '',
					lastNames: '',
					phone: '',
					identityNumber: '',
					typeIdentity: '',
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
					documentTypeOptions={[
						{
							code: 'CC',
							name: 'Cédula de Ciudadanía',
							dataType: 'NUMERIC',
							minLength: 6,
							maxLength: 10,
							status: true,
						},
						{
							code: 'PAS',
							name: 'Pasaporte',
							dataType: 'ALPHANUMERIC',
							minLength: 6,
							maxLength: 15,
							status: false,
						},
					]}
					clientResults={[]}
					onSearchClient={vi.fn().mockResolvedValue([])}
					onClientSelected={vi.fn()}
					isEditMode={false}
					isBlocked={false}
					isLeadConversion={false}
					getFieldPermission={() => ({
						readonly: false,
						disabled: false,
						hidden: false,
					})}
				/>
			)
		}

		render(<Form />)

		expect(screen.getByText('Tipo de Documento')).toBeInTheDocument()
		fireEvent.click(screen.getByRole('combobox', { name: /Tipo de Documento/ }))
		expect(await screen.findByText('Cédula de Ciudadanía (CC)')).toBeInTheDocument()
		expect(screen.queryByText(/Pasaporte/)).not.toBeInTheDocument()
	})

	it('hides the format warning in edit mode while the stored identity stays unchanged', async () => {
		function Form() {
			const form = useForm<BusinessFormData>({
				resolver: zodResolver(businessFormSchema),
				defaultValues: {
					email: 'ana@example.com',
					name: 'Ana',
					lastNames: 'Pérez',
					phone: '3001234567',
					identityNumber: '1.234.567',
					typeIdentity: 'CC',
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
					documentTypeOptions={[
						{
							code: 'CC',
							name: 'Cédula de Ciudadanía',
							dataType: 'NUMERIC',
							minLength: 6,
							maxLength: 10,
							status: true,
						},
					]}
					clientResults={[]}
					onSearchClient={vi.fn().mockResolvedValue([])}
					onClientSelected={vi.fn()}
					isEditMode
					isBlocked={false}
					isLeadConversion={false}
					getFieldPermission={() => ({
						readonly: false,
						disabled: false,
						hidden: false,
					})}
				/>
			)
		}

		render(<Form />)
		expect(screen.queryByText(/solo puede contener dígitos/)).not.toBeInTheDocument()

		fireEvent.change(screen.getByLabelText(/No\. Documento/), {
			target: { value: '9.876.543' },
		})
		expect(await screen.findByText(/solo puede contener dígitos/)).toBeInTheDocument()
	})
})

describe('ClientInfoSection — tomador', () => {
	it('asks whether the client is the same policyholder and defaults to yes', () => {
		render(<Wrapper isLeadConversion={false} />)

		expect(
			screen.getByRole('heading', {
				name: 'Información básica y general del Cliente',
			})
		).toBeInTheDocument()
		expect(
			screen.getByRole('checkbox', {
				name: '¿El cliente es el mismo tomador?',
			})
		).toBeChecked()
	})

	it('clears policyholder fields when the checkbox returns to yes', async () => {
		function Form() {
			const form = useForm<BusinessFormData>({
				defaultValues: {
					email: 'lead@example.com',
					name: 'Juan',
					lastNames: 'Pérez',
					phone: '3001234567',
					identityNumber: '12345678',
					typeIdentity: 'CC',
					clientOrigin: '1',
					company: '1',
					producto: '1',
					terms: 1,
					currency: '1',
					periodicity: '1',
					value: 1,
					agent: '1',
					clientIsPolicyholder: false,
					policyholderTypeIdentity: 'CC',
					policyholderIdentityNumber: '999',
					policyholderEmail: 'tomador@example.com',
					policyholderName: 'Ana',
					policyholderLastNames: 'Ruiz',
					policyholderPhone: '3000000000',
				},
			})

			return (
				<>
					<ClientInfoSection
						form={form}
						clientOriginsOptions={[{ value: '1', label: 'Origen' }]}
						clientResults={[]}
						onSearchClient={vi.fn().mockResolvedValue([])}
						onClientSelected={vi.fn()}
						isEditMode={false}
						isBlocked={false}
						getFieldPermission={() => ({
							readonly: false,
							disabled: false,
							hidden: false,
						})}
					/>
					<input
						aria-label="policyholder-email"
						value={form.watch('policyholderEmail') ?? ''}
						readOnly
					/>
				</>
			)
		}

		render(<Form />)
		fireEvent.click(
			screen.getByRole('checkbox', {
				name: '¿El cliente es el mismo tomador?',
			})
		)
		await waitFor(() => {
			expect(screen.getByLabelText('policyholder-email')).toHaveValue('')
		})
	})
})
