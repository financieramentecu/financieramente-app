import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PasswordInput } from '../password-input'

describe('PasswordInput', () => {
	it('renders as a password field by default, hiding the value', () => {
		render(<PasswordInput aria-label="password" value="secret" onChange={() => {}} />)
		expect(screen.getByLabelText('password')).toHaveAttribute('type', 'password')
	})

	it('reveals the value as plain text when the eye toggle is clicked', async () => {
		const user = userEvent.setup()
		render(<PasswordInput aria-label="password" value="secret" onChange={() => {}} />)

		const toggle = screen.getByRole('button', { name: 'Mostrar contraseña' })
		await user.click(toggle)

		expect(screen.getByLabelText('password')).toHaveAttribute('type', 'text')
		expect(
			screen.getByRole('button', { name: 'Ocultar contraseña' })
		).toBeInTheDocument()
	})

	it('hides it again on a second click', async () => {
		const user = userEvent.setup()
		render(<PasswordInput aria-label="password" value="secret" onChange={() => {}} />)

		await user.click(screen.getByRole('button', { name: 'Mostrar contraseña' }))
		await user.click(screen.getByRole('button', { name: 'Ocultar contraseña' }))

		expect(screen.getByLabelText('password')).toHaveAttribute('type', 'password')
	})

	it('never submits the form when the toggle is clicked', () => {
		render(<PasswordInput aria-label="password" value="secret" onChange={() => {}} />)
		expect(
			screen.getByRole('button', { name: 'Mostrar contraseña' })
		).toHaveAttribute('type', 'button')
	})

	it('forwards native input props such as disabled, required and id', () => {
		render(
			<PasswordInput
				id="my-password"
				aria-label="password"
				value="secret"
				onChange={() => {}}
				disabled
				required
			/>
		)
		const input = screen.getByLabelText('password')
		expect(input).toHaveAttribute('id', 'my-password')
		expect(input).toBeDisabled()
		expect(input).toBeRequired()
	})
})
