import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreateLeadDialog } from '../create-lead-dialog'
import { useSession } from 'next-auth/react'
import { useHierarchyAdvisors } from '@/features/leads/hooks/use-hierarchy-advisors'
vi.mock('next-auth/react', () => ({ useSession: vi.fn() }))
vi.mock('@/features/leads/hooks/use-hierarchy-advisors', () => ({
	useHierarchyAdvisors: vi.fn(),
}))
vi.mock('@/features/shared/ui/single-select', () => ({
	SingleSelect: ({
		ariaLabel,
		value,
		onChange,
		options,
	}: {
		ariaLabel: string
		value: string
		onChange: (value: string) => void
		options: Array<{ value: string; label: string }>
	}) => (
		<select
			aria-label={ariaLabel}
			value={value}
			onChange={(event) => onChange(event.target.value)}
		>
			<option value="">Asignarme</option>
			{options.map((option) => (
				<option key={option.value} value={option.value}>
					{option.label}
				</option>
			))}
		</select>
	),
}))
const fetchMock = vi.fn()
beforeEach(() => {
	vi.clearAllMocks()
	vi.stubGlobal('fetch', fetchMock)
	vi.mocked(useSession).mockReturnValue({
		data: { user: { role: 'AGENTE' } },
		status: 'authenticated',
		update: vi.fn(),
	} as never)
	vi.mocked(useHierarchyAdvisors).mockReturnValue({
		state: {
			status: 'success',
			data: [{ idUser: 2, name: 'Advisor' }],
			error: '',
		},
		canLead: false,
	})
	fetchMock.mockResolvedValue({
		ok: true,
		json: async () => ({ data: { idLead: 3, idUser: 1 } }),
	})
})
async function fill() {
	const user = userEvent.setup()
	await user.click(screen.getByRole('button', { name: 'Nuevo lead' }))
	await user.type(screen.getByLabelText('Nombre'), 'Ana')
	await user.type(screen.getByLabelText('Correo'), 'ana@example.com')
	return user
}
describe('CreateLeadDialog', () => {
	it('creates a leaf-owned lead without owner choice and calls refresh callback', async () => {
		const onCreated = vi.fn()
		render(<CreateLeadDialog onCreated={onCreated} />)
		const user = await fill()
		expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
		await user.click(screen.getByRole('button', { name: 'Crear lead' }))
		await waitFor(() =>
			expect(onCreated).toHaveBeenCalledWith({ idLead: 3, idUser: 1 })
		)
		expect(JSON.parse(fetchMock.mock.calls[0][1].body)).not.toHaveProperty(
			'idUser'
		)
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
		expect(useHierarchyAdvisors).toHaveBeenCalledWith(true)
	})
	it('offers a scoped advisor choice to leaders', async () => {
		vi.mocked(useHierarchyAdvisors).mockReturnValue({
			state: {
				status: 'success',
				data: [{ idUser: 2, name: 'Advisor' }],
				error: '',
			},
			canLead: true,
		})
		render(<CreateLeadDialog onCreated={vi.fn()} />)
		const user = await fill()
		await user.selectOptions(
			screen.getByRole('combobox', { name: 'Money Strategy' }),
			'2'
		)
		await user.click(screen.getByRole('button', { name: 'Crear lead' }))
		await waitFor(() => expect(fetchMock).toHaveBeenCalled())
		expect(JSON.parse(fetchMock.mock.calls[0][1].body).idUser).toBe(2)
	})
	it.each(['CONSULTOR', 'DEFAULT'])('hides creation for role %s', (role) => {
		vi.mocked(useSession).mockReturnValue({
			data: { user: { role } },
			status: 'authenticated',
		} as never)
		render(<CreateLeadDialog onCreated={vi.fn()} />)
		expect(
			screen.queryByRole('button', { name: 'Nuevo lead' })
		).not.toBeInTheDocument()
	})
	it('preserves input and presents an accessible server rejection', async () => {
		fetchMock.mockResolvedValue({
			ok: false,
			json: async () => ({ data: null, error: 'El origen Propio no está disponible' }),
		})
		render(<CreateLeadDialog onCreated={vi.fn()} />)
		const user = await fill()
		await user.click(screen.getByRole('button', { name: 'Crear lead' }))
		expect(await screen.findByRole('alert')).toHaveTextContent(
			'El origen Propio no está disponible'
		)
		expect(screen.getByLabelText('Nombre')).toHaveValue('Ana')
		expect(screen.getByLabelText('Correo')).toHaveValue('ana@example.com')
	})
	it('disables submission while pending and keeps fields on network failure', async () => {
		let reject: (reason: Error) => void = () => {}
		fetchMock.mockReturnValue(
			new Promise((_resolve, rejectPromise) => {
				reject = rejectPromise
			})
		)
		render(<CreateLeadDialog onCreated={vi.fn()} />)
		const user = await fill()
		await user.click(screen.getByRole('button', { name: 'Crear lead' }))
		expect(screen.getByRole('button', { name: 'Creando…' })).toBeDisabled()
		await user.click(screen.getByRole('button', { name: 'Close' }))
		expect(screen.getByRole('dialog')).toBeInTheDocument()
		expect(fetchMock).toHaveBeenCalledTimes(1)
		reject(new Error('Sin conexión'))
		expect(await screen.findByRole('alert')).toHaveTextContent('Sin conexión')
		expect(screen.getByLabelText('Nombre')).toHaveValue('Ana')
	})
	it('validates required contact before submitting', async () => {
		render(<CreateLeadDialog onCreated={vi.fn()} />)
		const user = userEvent.setup()
		await user.click(screen.getByRole('button', { name: 'Nuevo lead' }))
		await user.type(screen.getByLabelText('Nombre'), 'Ana')
		fireEvent.submit(
			screen.getByRole('button', { name: 'Crear lead' }).closest('form')!
		)
		expect(await screen.findByRole('alert')).toHaveTextContent(
			'Ingresa correo, teléfono o documento'
		)
		expect(fetchMock).not.toHaveBeenCalled()
	})
})
