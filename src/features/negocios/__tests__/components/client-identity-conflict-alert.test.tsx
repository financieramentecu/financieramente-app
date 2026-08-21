import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ClientIdentityConflictAlert } from '@/features/negocios/components/sections/client-identity-conflict-alert'

describe('ClientIdentityConflictAlert (D5)', () => {
	it('renders the stored and typed document numbers with both actions', () => {
		render(
			<ClientIdentityConflictAlert
				storedIdentityNumber="1111111111"
				typedIdentityNumber="2222222222"
				canUpdateDocument
				onKeep={vi.fn()}
				onUpdate={vi.fn()}
			/>
		)

		expect(screen.getByText(/1111111111/)).toBeInTheDocument()
		expect(screen.getByText(/2222222222/)).toBeInTheDocument()
		expect(
			screen.getByRole('button', { name: /actualizar documento/i })
		).toBeInTheDocument()
		expect(
			screen.getByRole('button', { name: /mantener el existente/i })
		).toBeInTheDocument()
	})

	it('calls onKeep when "Mantener el existente" is clicked', () => {
		const onKeep = vi.fn()
		render(
			<ClientIdentityConflictAlert
				storedIdentityNumber="1111111111"
				typedIdentityNumber="2222222222"
				canUpdateDocument
				onKeep={onKeep}
				onUpdate={vi.fn()}
			/>
		)

		fireEvent.click(screen.getByRole('button', { name: /mantener el existente/i }))
		expect(onKeep).toHaveBeenCalledTimes(1)
	})

	it('calls onUpdate when "Actualizar documento" is clicked and canUpdateDocument is true', () => {
		const onUpdate = vi.fn()
		render(
			<ClientIdentityConflictAlert
				storedIdentityNumber="1111111111"
				typedIdentityNumber="2222222222"
				canUpdateDocument
				onKeep={vi.fn()}
				onUpdate={onUpdate}
			/>
		)

		fireEvent.click(screen.getByRole('button', { name: /actualizar documento/i }))
		expect(onUpdate).toHaveBeenCalledTimes(1)
	})

	it('disables "Actualizar documento" with an explanatory caption when canUpdateDocument is false', () => {
		render(
			<ClientIdentityConflictAlert
				storedIdentityNumber="1111111111"
				typedIdentityNumber="2222222222"
				canUpdateDocument={false}
				onKeep={vi.fn()}
				onUpdate={vi.fn()}
			/>
		)

		const updateButton = screen.getByRole('button', {
			name: /actualizar documento/i,
		})
		expect(updateButton).toBeDisabled()
		expect(
			screen.getByText(/no tienes permisos para actualizar el documento/i)
		).toBeInTheDocument()
	})

	it('renders the server-error slot when error is provided', () => {
		render(
			<ClientIdentityConflictAlert
				storedIdentityNumber="1111111111"
				typedIdentityNumber="2222222222"
				canUpdateDocument
				onKeep={vi.fn()}
				onUpdate={vi.fn()}
				error="No tienes permisos para editar la información del cliente"
			/>
		)

		expect(
			screen.getByText(/no tienes permisos para editar la información del cliente/i)
		).toBeInTheDocument()
	})
})
