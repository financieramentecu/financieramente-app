import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mocks = vi.hoisted(() => ({
	submit: vi.fn(),
	reset: vi.fn(),
	selectLevel: vi.fn(),
	picker: {
		levels: {
			status: 'success',
			data: [
				{ code: 'LEVEL_1', name: 'Nivel 1' },
				{ code: 'LEVEL_2', name: 'Director' },
			],
			error: '',
		} as Record<string, unknown>,
		leaders: { status: 'idle', data: undefined, error: '' } as Record<
			string,
			unknown
		>,
		levelCode: null as string | null,
	},
}))

vi.mock('../../hooks/use-create-partner', () => ({
	useCreatePartner: () => ({
		state: { status: 'idle', data: undefined, error: '' },
		submit: mocks.submit,
		reset: mocks.reset,
	}),
}))
vi.mock('../../hooks/use-leader-picker', () => ({
	useLeaderPicker: () => ({
		...mocks.picker,
		selectLevel: mocks.selectLevel,
	}),
}))

import { CreatePartnerDialog } from '../create-partner-dialog'

function renderDialog() {
	const onCreated = vi.fn()
	render(
		<CreatePartnerDialog open onOpenChange={vi.fn()} onCreated={onCreated} />
	)
	return { onCreated }
}

beforeEach(() => {
	vi.clearAllMocks()
	mocks.picker.levelCode = null
	mocks.picker.leaders = { status: 'idle', data: undefined, error: '' }
	mocks.submit.mockResolvedValue({
		ok: true,
		data: { emailSent: true, name: 'Ana', email: 'a@p.com' },
	})
})

describe('CreatePartnerDialog', () => {
	it('shows the category preselected as "Partner Externo" and locked', () => {
		renderDialog()
		const category = screen.getByLabelText('Categoría')
		expect(category).toHaveValue('Partner Externo')
		expect(category).toBeDisabled()
	})

	it('offers no role or level selector (server-assigned)', () => {
		renderDialog()
		expect(screen.queryByLabelText(/^rol/i)).toBeNull()
		expect(screen.queryByLabelText(/^nivel$/i)).toBeNull()
	})

	it('keeps the leader select disabled until a level is chosen (two steps)', () => {
		renderDialog()
		expect(
			screen.getByRole('combobox', { name: /nivel del líder/i })
		).toBeEnabled()
		expect(screen.getByRole('combobox', { name: /^líder/i })).toBeDisabled()
	})

	it('lists only the levels returned by the server, by display name', async () => {
		renderDialog()
		await userEvent.click(
			screen.getByRole('combobox', { name: /nivel del líder/i })
		)
		expect(
			await screen.findByRole('option', { name: 'Nivel 1' })
		).toBeInTheDocument()
		expect(screen.getByRole('option', { name: 'Director' })).toBeInTheDocument()
		expect(screen.queryByRole('option', { name: /partner/i })).toBeNull()
		expect(screen.getAllByRole('option')).toHaveLength(2)
	})

	it('requests the leaders of the chosen level', async () => {
		renderDialog()
		await userEvent.click(
			screen.getByRole('combobox', { name: /nivel del líder/i })
		)
		await userEvent.click(
			await screen.findByRole('option', { name: 'Director' })
		)
		expect(mocks.selectLevel).toHaveBeenCalledWith('LEVEL_2')
	})

	it('blocks submit with Spanish validation errors and does not call the API', async () => {
		renderDialog()
		await userEvent.click(
			screen.getByRole('button', { name: /crear partner/i })
		)
		expect(
			await screen.findByText('El nombre es obligatorio')
		).toBeInTheDocument()
		expect(screen.getByText('Selecciona un líder')).toBeInTheDocument()
		expect(mocks.submit).not.toHaveBeenCalled()
	})

	it('submits the typed personal data with the selected leader', async () => {
		mocks.picker.levelCode = 'LEVEL_2'
		mocks.picker.leaders = {
			status: 'success',
			data: [{ id: 7, name: 'Luis', lastName: 'Pérez', email: 'l@c.com' }],
			error: '',
		}
		const { onCreated } = renderDialog()

		await userEvent.type(screen.getByLabelText(/^nombre/i), 'Ana')
		await userEvent.type(screen.getByLabelText(/^apellido/i), 'Gómez')
		await userEvent.type(
			screen.getByLabelText(/número de documento/i),
			'1020304050'
		)
		await userEvent.type(
			screen.getByLabelText(/correo electrónico/i),
			'Ana@Partner.com'
		)
		await userEvent.click(screen.getByRole('combobox', { name: /^líder/i }))
		await userEvent.click(
			await screen.findByRole('option', { name: /Luis Pérez/ })
		)
		await userEvent.click(
			screen.getByRole('button', { name: /crear partner/i })
		)

		await waitFor(() => expect(mocks.submit).toHaveBeenCalledTimes(1))
		expect(mocks.submit).toHaveBeenCalledWith(
			expect.objectContaining({
				name: 'Ana',
				lastName: 'Gómez',
				typeIdentity: 'CC',
				identityNumber: '1020304050',
				email: 'ana@partner.com',
				leaderId: 7,
			})
		)
		await waitFor(() => expect(onCreated).toHaveBeenCalled())
	})
})
