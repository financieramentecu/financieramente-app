import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PartnerDto } from '../../types/partner.types'

const mocks = vi.hoisted(() => ({
	submit: vi.fn(),
	reset: vi.fn(),
	selectLevel: vi.fn(),
	pickerArgs: [] as unknown[],
	requestState: { status: 'idle', data: undefined, error: '' } as Record<
		string,
		unknown
	>,
	picker: {
		levels: {
			status: 'success',
			data: [
				{ code: 'LEVEL_1', name: 'Nivel 1' },
				{ code: 'LEVEL_2', name: 'Director' },
			],
			error: '',
		} as Record<string, unknown>,
		leaders: {
			status: 'success',
			data: [
				{ id: 7, name: 'Luis', lastName: 'Pérez', email: 'l@c.com' },
				{ id: 8, name: 'Marta', lastName: null, email: 'm@c.com' },
			],
			error: '',
		} as Record<string, unknown>,
		levelCode: 'LEVEL_2' as string | null,
	},
}))

vi.mock('../../hooks/use-update-partner', () => ({
	useUpdatePartner: () => ({
		state: mocks.requestState,
		submit: mocks.submit,
		reset: mocks.reset,
	}),
}))
vi.mock('../../hooks/use-leader-picker', () => ({
	useLeaderPicker: (initial?: string | null) => {
		mocks.pickerArgs.push(initial)
		return { ...mocks.picker, selectLevel: mocks.selectLevel }
	},
}))

import { EditPartnerDialog } from '../edit-partner-dialog'

const PARTNER: PartnerDto = {
	id: 21,
	name: 'Ana',
	lastName: 'Gómez',
	typeIdentity: 'CE',
	identityNumber: '555',
	email: 'ana@partner.com',
	phone: '3001234567',
	active: true,
	activatedAt: null,
	createdAt: '2026-10-10T12:00:00.000Z',
	status: 'PENDING',
	leader: {
		id: 7,
		name: 'Luis',
		lastName: 'Pérez',
		email: 'l@c.com',
		levelCode: 'LEVEL_2',
	},
}

function renderDialog(partner: PartnerDto = PARTNER) {
	const onUpdated = vi.fn()
	const onOpenChange = vi.fn()
	render(
		<EditPartnerDialog
			open
			partner={partner}
			onOpenChange={onOpenChange}
			onUpdated={onUpdated}
		/>
	)
	return { onUpdated, onOpenChange }
}

beforeEach(() => {
	vi.clearAllMocks()
	mocks.pickerArgs.length = 0
	mocks.requestState = { status: 'idle', data: undefined, error: '' }
	mocks.submit.mockResolvedValue({ ok: true, data: PARTNER })
})

describe('EditPartnerDialog', () => {
	it('prefills the partner data', () => {
		renderDialog()
		expect(screen.getByLabelText(/^nombre/i)).toHaveValue('Ana')
		expect(screen.getByLabelText(/^apellido/i)).toHaveValue('Gómez')
		expect(screen.getByLabelText(/número de documento/i)).toHaveValue('555')
		expect(screen.getByLabelText(/^teléfono/i)).toHaveValue('3001234567')
		expect(
			screen.getByRole('combobox', { name: /tipo de documento/i })
		).toHaveTextContent(/extranjería/i)
	})

	it('shows the email read-only and the category locked', () => {
		renderDialog()
		const email = screen.getByLabelText(/correo electrónico/i)
		expect(email).toHaveValue('ana@partner.com')
		expect(email).toHaveAttribute('readonly')
		const category = screen.getByLabelText('Categoría')
		expect(category).toHaveValue('Partner Externo')
		expect(category).toBeDisabled()
	})

	it('preselects the current leader level and leader (two-step picker)', () => {
		renderDialog()
		expect(mocks.pickerArgs[0]).toBe('LEVEL_2')
		expect(
			screen.getByRole('combobox', { name: /nivel del líder/i })
		).toHaveTextContent('Director')
		expect(screen.getByRole('combobox', { name: /^líder/i })).toHaveTextContent(
			'Luis Pérez'
		)
	})

	it('submits the unchanged data plus edits, never the email', async () => {
		const { onUpdated, onOpenChange } = renderDialog()
		const phone = screen.getByLabelText(/^teléfono/i)
		await userEvent.clear(phone)
		await userEvent.type(phone, '3110000000')
		await userEvent.click(
			screen.getByRole('button', { name: /guardar cambios/i })
		)

		await waitFor(() => expect(mocks.submit).toHaveBeenCalledTimes(1))
		const [id, payload] = mocks.submit.mock.calls[0]
		expect(id).toBe(21)
		expect(payload).toEqual({
			name: 'Ana',
			lastName: 'Gómez',
			typeIdentity: 'CE',
			identityNumber: '555',
			phone: '3110000000',
			leaderId: 7,
		})
		expect(payload).not.toHaveProperty('email')
		await waitFor(() => expect(onUpdated).toHaveBeenCalled())
		expect(onOpenChange).toHaveBeenCalledWith(false)
	})

	it('changes the leader through the two steps', async () => {
		renderDialog()
		await userEvent.click(
			screen.getByRole('combobox', { name: /nivel del líder/i })
		)
		await userEvent.click(
			await screen.findByRole('option', { name: 'Nivel 1' })
		)
		expect(mocks.selectLevel).toHaveBeenCalledWith('LEVEL_1')

		await userEvent.click(screen.getByRole('combobox', { name: /^líder/i }))
		await userEvent.click(await screen.findByRole('option', { name: 'Marta' }))
		await userEvent.click(
			screen.getByRole('button', { name: /guardar cambios/i })
		)
		await waitFor(() => expect(mocks.submit).toHaveBeenCalled())
		expect(mocks.submit.mock.calls[0][1]).toMatchObject({ leaderId: 8 })
	})

	it('clears the previous leader when the level changes, so a new leader must be picked', async () => {
		renderDialog()
		await userEvent.click(
			screen.getByRole('combobox', { name: /nivel del líder/i })
		)
		await userEvent.click(
			await screen.findByRole('option', { name: 'Nivel 1' })
		)
		await userEvent.click(
			screen.getByRole('button', { name: /guardar cambios/i })
		)
		// The original leader (7) must NOT be restored: the form stays invalid.
		await waitFor(() =>
			expect(mocks.selectLevel).toHaveBeenCalledWith('LEVEL_1')
		)
		expect(mocks.submit).not.toHaveBeenCalled()
	})

	it('blocks submit with Spanish validation errors', async () => {
		renderDialog()
		await userEvent.clear(screen.getByLabelText(/^nombre/i))
		await userEvent.click(
			screen.getByRole('button', { name: /guardar cambios/i })
		)
		expect(
			await screen.findByText('El nombre es obligatorio')
		).toBeInTheDocument()
		expect(mocks.submit).not.toHaveBeenCalled()
	})

	it('shows the API error and keeps the dialog open', async () => {
		mocks.requestState = {
			status: 'error',
			data: undefined,
			error: 'Este documento ya está registrado',
		}
		mocks.submit.mockResolvedValue({
			ok: false,
			error: 'Este documento ya está registrado',
		})
		const { onUpdated, onOpenChange } = renderDialog()
		expect(
			screen.getByText('Este documento ya está registrado')
		).toBeInTheDocument()
		await userEvent.click(
			screen.getByRole('button', { name: /guardar cambios/i })
		)
		await waitFor(() => expect(mocks.submit).toHaveBeenCalled())
		expect(onUpdated).not.toHaveBeenCalled()
		expect(onOpenChange).not.toHaveBeenCalledWith(false)
	})

	it('handles a partner without leader: leader required again', async () => {
		mocks.picker.levelCode = null
		mocks.picker.leaders = { status: 'idle', data: undefined, error: '' }
		renderDialog({ ...PARTNER, leader: null })
		await userEvent.click(
			screen.getByRole('button', { name: /guardar cambios/i })
		)
		expect(await screen.findByText('Selecciona un líder')).toBeInTheDocument()
		expect(mocks.submit).not.toHaveBeenCalled()
		mocks.picker.levelCode = 'LEVEL_2'
		mocks.picker.leaders = {
			status: 'success',
			data: [
				{ id: 7, name: 'Luis', lastName: 'Pérez', email: 'l@c.com' },
				{ id: 8, name: 'Marta', lastName: null, email: 'm@c.com' },
			],
			error: '',
		}
	})
})
