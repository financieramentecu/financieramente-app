import { render, act } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BusinessInfoSection } from '../business-info-section'
import type { BusinessFormData } from '@/features/negocios/lib/business-form-schemas'

vi.mock('@/features/negocios/components/fields/form-select-field', () => ({
	FormSelectField: ({
		name,
		disabled,
	}: {
		name: string
		disabled?: boolean
	}) => (
		<div
			data-testid={`field-${name}`}
			data-disabled={disabled ? 'true' : 'false'}
		/>
	),
}))
vi.mock('@/features/negocios/components/fields/currency-input-field', () => ({
	CurrencyInputField: () => <div />,
}))
vi.mock('@/features/negocios/components/fields/number-input-field', () => ({
	NumberInputField: () => <div />,
}))
vi.mock('@/features/negocios/components/fields/contract-autocomplete', () => ({
	ContractAutocomplete: () => <div />,
}))

const SKANDIA = { value: '1', label: 'SKANDIA' }
const MFUND = { value: '10', label: 'MFUND', companyId: '1' }
const APORTE_OCASIONAL = { value: '5', label: 'Aportes Ocasionales' }
const MENSUAL = { value: '2', label: 'Mensual' }

const defaultProps = {
	currenciesOptions: [],
	periodicitiesOptions: [APORTE_OCASIONAL, MENSUAL],
	companiesOptions: [SKANDIA],
	filteredProducts: [MFUND],
	isBlocked: false,
	getFieldPermission: () => ({
		disabled: false,
		readonly: false,
		hidden: false,
	}),
}

describe('BusinessInfoSection — SKANDIA+MFUND periodicity autofill', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('autofills "Aportes Ocasionales" on create when SKANDIA+MFUND is selected', async () => {
		const setValueSpy = vi.fn()

		function WrapperWithMockedSetValue() {
			const form = useForm<BusinessFormData>({
				defaultValues: {
					company: SKANDIA.value,
					producto: MFUND.value,
					periodicity: '',
					terms: 0,
					numAportes: 0,
					isSkandiaWithMfund: false,
				} as BusinessFormData,
			})
			const originalSetValue = form.setValue
			form.setValue = ((...args: Parameters<typeof originalSetValue>) => {
				setValueSpy(...args)
				return originalSetValue(...args)
			}) as typeof originalSetValue

			return (
				<BusinessInfoSection {...defaultProps} form={form} isEditMode={false} />
			)
		}

		await act(async () => {
			render(<WrapperWithMockedSetValue />)
		})

		expect(setValueSpy).toHaveBeenCalledWith(
			'periodicity',
			APORTE_OCASIONAL.value,
			{ shouldValidate: false }
		)
	})

	it('forces Aportes Ocasionales on edit and locks the select', async () => {
		const setValueSpy = vi.fn()

		function WrapperEditMode() {
			const form = useForm<BusinessFormData>({
				defaultValues: {
					company: SKANDIA.value,
					producto: MFUND.value,
					periodicity: MENSUAL.value,
					terms: 0,
					numAportes: 0,
					isSkandiaWithMfund: true,
				} as BusinessFormData,
			})
			const originalSetValue = form.setValue
			form.setValue = ((...args: Parameters<typeof originalSetValue>) => {
				setValueSpy(...args)
				return originalSetValue(...args)
			}) as typeof originalSetValue

			return (
				<BusinessInfoSection {...defaultProps} form={form} isEditMode={true} />
			)
		}

		await act(async () => {
			render(<WrapperEditMode />)
		})

		expect(setValueSpy).toHaveBeenCalledWith(
			'periodicity',
			APORTE_OCASIONAL.value,
			{ shouldValidate: false }
		)
		expect(
			document
				.querySelector('[data-testid="field-periodicity"]')
				?.getAttribute('data-disabled')
		).toBe('true')
	})

	it('puts the periodicity back when it is changed while SKANDIA+MFUND stays selected', async () => {
		let capturedForm: ReturnType<typeof useForm<BusinessFormData>> | undefined

		function WrapperCapture() {
			const form = useForm<BusinessFormData>({
				defaultValues: {
					company: SKANDIA.value,
					producto: MFUND.value,
					periodicity: '',
					terms: 0,
					numAportes: 0,
					isSkandiaWithMfund: false,
				} as BusinessFormData,
			})
			capturedForm = form
			return (
				<BusinessInfoSection {...defaultProps} form={form} isEditMode={false} />
			)
		}

		await act(async () => {
			render(<WrapperCapture />)
		})

		expect(capturedForm!.getValues('periodicity')).toBe(APORTE_OCASIONAL.value)

		await act(async () => {
			capturedForm!.setValue('periodicity', MENSUAL.value, {
				shouldValidate: false,
			})
		})

		expect(capturedForm!.getValues('periodicity')).toBe(APORTE_OCASIONAL.value)
	})

	it('applies Aportes Ocasionales when switching into MFUND and leaves other products editable', async () => {
		const ces = { value: '20', label: 'CES', companyId: '1' }
		let capturedForm: ReturnType<typeof useForm<BusinessFormData>> | undefined

		function Wrapper() {
			const form = useForm<BusinessFormData>({
				defaultValues: {
					company: SKANDIA.value,
					producto: ces.value,
					periodicity: MENSUAL.value,
					terms: 1,
					numAportes: 1,
					isSkandiaWithMfund: false,
				} as BusinessFormData,
			})
			capturedForm = form
			return (
				<BusinessInfoSection
					{...defaultProps}
					filteredProducts={[MFUND, ces]}
					form={form}
					isEditMode={true}
				/>
			)
		}

		await act(async () => {
			render(<Wrapper />)
		})

		expect(capturedForm!.getValues('periodicity')).toBe(MENSUAL.value)

		await act(async () => {
			capturedForm!.setValue('producto', MFUND.value)
		})

		expect(capturedForm!.getValues('periodicity')).toBe(APORTE_OCASIONAL.value)

		await act(async () => {
			capturedForm!.setValue('producto', ces.value)
			capturedForm!.setValue('periodicity', MENSUAL.value, {
				shouldValidate: false,
			})
		})

		expect(capturedForm!.getValues('periodicity')).toBe(MENSUAL.value)
	})

	it('does NOT autofill when company is not SKANDIA', async () => {
		const OTHER = { value: '99', label: 'OTRA_COMPANIA' }
		const setValueSpy = vi.fn()

		function WrapperOtherCompany() {
			const form = useForm<BusinessFormData>({
				defaultValues: {
					company: OTHER.value,
					producto: MFUND.value,
					periodicity: '',
					terms: 0,
					numAportes: 0,
					isSkandiaWithMfund: false,
				} as BusinessFormData,
			})
			const originalSetValue = form.setValue
			form.setValue = ((...args: Parameters<typeof originalSetValue>) => {
				setValueSpy(...args)
				return originalSetValue(...args)
			}) as typeof originalSetValue

			return (
				<BusinessInfoSection
					{...defaultProps}
					companiesOptions={[OTHER]}
					filteredProducts={[MFUND]}
					form={form}
					isEditMode={false}
				/>
			)
		}

		await act(async () => {
			render(<WrapperOtherCompany />)
		})

		const periodicityCall = setValueSpy.mock.calls.find(
			([field]) => field === 'periodicity'
		)
		expect(periodicityCall).toBeUndefined()
	})
})
