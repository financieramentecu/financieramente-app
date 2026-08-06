import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
	businessFormSchema,
	type BusinessFormData,
} from '@/features/negocios/lib/business-form-schemas'
import { CoachInfoSection } from '@/features/negocios/components/sections/coach-info-section'

function Wrapper({ isAgentLocked }: { isAgentLocked?: boolean }) {
	const form = useForm<BusinessFormData>({
		resolver: zodResolver(businessFormSchema),
		defaultValues: {
			email: '',
			name: '',
			lastNames: '',
			phone: '',
			identityNumber: '',
			clientOrigin: '',
			company: '',
			producto: '',
			terms: undefined,
			currency: '',
			periodicity: '',
			value: undefined,
			agent: '9',
		},
	})

	return (
		<CoachInfoSection
			form={form}
			agentsList={[]}
			isBlocked={false}
			isAgentLocked={isAgentLocked}
		/>
	)
}

describe('CoachInfoSection — lead-owner lock', () => {
	it('disables the agent autocomplete when isAgentLocked is true', () => {
		render(<Wrapper isAgentLocked />)
		expect(screen.getByRole('combobox')).toBeDisabled()
	})

	it('shows an explanatory caption when isAgentLocked is true', () => {
		render(<Wrapper isAgentLocked />)
		expect(
			screen.getByText(/owner.*asignado.*lead|money strategist responsable/i)
		).toBeInTheDocument()
	})

	it('does not disable the agent autocomplete when isAgentLocked is false', () => {
		render(<Wrapper isAgentLocked={false} />)
		expect(screen.getByRole('combobox')).not.toBeDisabled()
	})
})
