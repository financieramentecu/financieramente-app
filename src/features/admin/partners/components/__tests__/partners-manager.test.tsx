import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PartnerDto } from '../../types/partner.types'

const mocks = vi.hoisted(() => ({
	refresh: vi.fn(),
	run: vi.fn(),
	update: vi.fn(),
	toastSuccess: vi.fn(),
	toastError: vi.fn(),
	toastWarning: vi.fn(),
	flagEnabled: false,
	partnersState: {
		status: 'success',
		data: [] as unknown[],
		error: '',
	} as Record<string, unknown>,
}))

vi.mock('../../hooks/use-partners', () => ({
	usePartners: () => ({ state: mocks.partnersState, refresh: mocks.refresh }),
}))
vi.mock('../../hooks/use-partner-actions', () => ({
	usePartnerActions: () => ({ pending: null, run: mocks.run }),
}))
vi.mock('../create-partner-dialog', () => ({
	CreatePartnerDialog: (props: {
		open: boolean
		onCreated: (p: unknown) => void
	}) =>
		props.open ? (
			<div data-testid="create-dialog">
				<button
					onClick={() =>
						props.onCreated({
							name: 'Ana',
							email: 'ana@p.com',
							emailSent: false,
						})
					}
				>
					simulate-created
				</button>
			</div>
		) : null,
}))
vi.mock('../edit-partner-dialog', () => ({
	EditPartnerDialog: (props: {
		partner: { name: string }
		onUpdated: (p: unknown) => void
		onOpenChange: (open: boolean) => void
	}) => (
		<div data-testid="edit-dialog">
			editing {props.partner.name}
			<button onClick={() => props.onUpdated({ name: 'Ana' })}>
				simulate-updated
			</button>
			<button onClick={() => props.onOpenChange(false)}>simulate-close</button>
		</div>
	),
}))
vi.mock('@/features/shared/hooks/use-feature-flag', () => ({
	useFeatureFlag: () => ({ enabled: mocks.flagEnabled, value: null }),
}))
vi.mock('next-auth/react', () => ({
	useSession: () => ({ update: mocks.update }),
}))
vi.mock('sonner', () => ({
	toast: {
		success: mocks.toastSuccess,
		error: mocks.toastError,
		warning: mocks.toastWarning,
	},
}))

import { PartnersManager } from '../partners-manager'

const PENDING: PartnerDto = {
	id: 1,
	name: 'Ana',
	lastName: 'Gómez',
	typeIdentity: 'CC',
	identityNumber: '1',
	email: 'ana@p.com',
	phone: null,
	active: true,
	activatedAt: null,
	createdAt: '2026-10-10T12:00:00.000Z',
	status: 'PENDING',
	leader: null,
}

beforeEach(() => {
	vi.clearAllMocks()
	mocks.flagEnabled = false
	mocks.partnersState = { status: 'success', data: [PENDING], error: '' }
	mocks.run.mockResolvedValue({ ok: true })
})

describe('PartnersManager', () => {
	it('opens the create dialog and warns when the activation e-mail could not be sent', async () => {
		render(<PartnersManager />)
		expect(screen.queryByTestId('create-dialog')).toBeNull()
		await userEvent.click(
			screen.getByRole('button', { name: /crear partner/i })
		)
		await userEvent.click(screen.getByText('simulate-created'))

		expect(mocks.refresh).toHaveBeenCalled()
		expect(mocks.toastWarning).toHaveBeenCalledWith(
			expect.stringContaining('no se pudo enviar el correo')
		)
		expect(mocks.toastSuccess).not.toHaveBeenCalled()
	})

	it('asks for confirmation before deactivating and only then runs the action', async () => {
		render(<PartnersManager />)
		await userEvent.click(screen.getByRole('button', { name: /^desactivar/i }))

		expect(mocks.run).not.toHaveBeenCalled()
		const dialog = await screen.findByRole('alertdialog')
		await userEvent.click(
			within(dialog).getByRole('button', { name: /desactivar/i })
		)

		expect(mocks.run).toHaveBeenCalledWith('deactivate', 1)
		expect(mocks.toastSuccess).toHaveBeenCalledWith('Partner desactivado')
	})

	it('resends the activation without confirmation and reports delivery', async () => {
		mocks.run.mockResolvedValue({ ok: true, emailSent: true })
		render(<PartnersManager />)
		await userEvent.click(
			screen.getByRole('button', { name: /reenviar activación/i })
		)
		expect(mocks.run).toHaveBeenCalledWith('resend', 1)
		expect(mocks.toastSuccess).toHaveBeenCalledWith(
			expect.stringContaining('Se envió el correo de activación')
		)
	})

	it('shows the server error as a toast when an action fails', async () => {
		mocks.run.mockResolvedValue({
			ok: false,
			error: 'El partner ya activó su cuenta',
		})
		render(<PartnersManager />)
		await userEvent.click(
			screen.getByRole('button', { name: /reenviar activación/i })
		)
		expect(mocks.toastError).toHaveBeenCalledWith(
			'El partner ya activó su cuenta'
		)
	})

	it('opens the edit dialog for the chosen partner, then refreshes and toasts on success', async () => {
		render(<PartnersManager />)
		expect(screen.queryByTestId('edit-dialog')).toBeNull()
		await userEvent.click(screen.getByRole('button', { name: /editar/i }))
		expect(screen.getByTestId('edit-dialog')).toHaveTextContent('editing Ana')

		await userEvent.click(screen.getByText('simulate-updated'))
		expect(mocks.refresh).toHaveBeenCalled()
		expect(mocks.toastSuccess).toHaveBeenCalledWith('Partner actualizado')
	})

	it('closes the edit dialog', async () => {
		render(<PartnersManager />)
		await userEvent.click(screen.getByRole('button', { name: /editar/i }))
		await userEvent.click(screen.getByText('simulate-close'))
		expect(screen.queryByTestId('edit-dialog')).toBeNull()
	})

	it('renders the load error', () => {
		mocks.partnersState = {
			status: 'error',
			data: undefined,
			error: 'Sin permisos',
		}
		render(<PartnersManager />)
		expect(screen.getByText('Sin permisos')).toBeInTheDocument()
	})

	it('starts impersonation of a pending partner when the flag is on', async () => {
		mocks.flagEnabled = true
		mocks.update.mockResolvedValue(undefined)
		const assign = vi.fn()
		Object.defineProperty(window, 'location', {
			value: { href: '', assign },
			writable: true,
		})
		render(<PartnersManager />)
		await userEvent.click(screen.getByRole('button', { name: /ver como/i }))
		expect(mocks.update).toHaveBeenCalledWith({ impersonateUserId: '1' })
	})

	it('hides "Ver como" when the flag is off', () => {
		render(<PartnersManager />)
		expect(screen.queryByRole('button', { name: /ver como/i })).toBeNull()
	})
})
