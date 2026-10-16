import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PasswordRequirementsChecklist } from '../password-requirements-checklist'
import { PASSWORD_REQUIREMENTS } from '@/features/auth/lib/account-password.schema'

describe('PasswordRequirementsChecklist', () => {
	it('renders one item per password requirement', () => {
		render(<PasswordRequirementsChecklist password="" />)
		for (const requirement of PASSWORD_REQUIREMENTS) {
			expect(screen.getByText(requirement.label)).toBeInTheDocument()
		}
	})

	it('marks every requirement as not met for an empty password', () => {
		render(<PasswordRequirementsChecklist password="" />)
		for (const requirement of PASSWORD_REQUIREMENTS) {
			expect(screen.getByText(requirement.label)).toHaveAttribute(
				'data-met',
				'false'
			)
		}
	})

	it('marks each requirement individually as it becomes met', () => {
		render(<PasswordRequirementsChecklist password="abcdefg1" />)
		// length, lowercase, number met; uppercase, special not met
		expect(screen.getByText('Mínimo 8 caracteres')).toHaveAttribute(
			'data-met',
			'true'
		)
		expect(screen.getByText('Una letra minúscula')).toHaveAttribute(
			'data-met',
			'true'
		)
		expect(screen.getByText('Un número')).toHaveAttribute('data-met', 'true')
		expect(screen.getByText('Una letra mayúscula')).toHaveAttribute(
			'data-met',
			'false'
		)
		expect(
			screen.getByText('Un carácter especial (!@#$%...)')
		).toHaveAttribute('data-met', 'false')
	})

	it('marks every requirement as met for a fully compliant password', () => {
		render(<PasswordRequirementsChecklist password="Abcdefg1!" />)
		for (const requirement of PASSWORD_REQUIREMENTS) {
			expect(screen.getByText(requirement.label)).toHaveAttribute(
				'data-met',
				'true'
			)
		}
	})
})
