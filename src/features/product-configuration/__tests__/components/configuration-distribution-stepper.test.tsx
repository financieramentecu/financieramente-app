import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ConfigurationDistributionStepper } from '../../components/configuration-distribution-stepper'

describe('ConfigurationDistributionStepper', () => {
	it('shows step 1 of 2 and aria-current on first step', () => {
		render(<ConfigurationDistributionStepper currentStep={1} />)

		expect(screen.getByText('Paso 1 de 2')).toBeInTheDocument()
		const steps = screen.getAllByRole('listitem')
		expect(steps[0]).toHaveAttribute('aria-current', 'step')
		expect(steps[1]).not.toHaveAttribute('aria-current')
	})

	it('shows step 2 of 2 and aria-current on second step', () => {
		render(<ConfigurationDistributionStepper currentStep={2} />)

		expect(screen.getByText('Paso 2 de 2')).toBeInTheDocument()
		const steps = screen.getAllByRole('listitem')
		expect(steps[1]).toHaveAttribute('aria-current', 'step')
		expect(steps[0]).not.toHaveAttribute('aria-current')
	})
})
