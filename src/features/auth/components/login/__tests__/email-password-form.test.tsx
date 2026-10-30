import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EmailPasswordForm } from '../email-password-form'

describe('EmailPasswordForm', () => {
	it('offers the forgot-password link (AA-10)', () => {
		render(<EmailPasswordForm />)
		const link = screen.getByRole('link', { name: '¿Olvidaste tu contraseña?' })
		expect(link.getAttribute('href')).toBe('/forgot-password')
	})
})
