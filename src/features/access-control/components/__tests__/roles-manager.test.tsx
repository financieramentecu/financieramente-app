import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mocks = vi.hoisted(() => ({
	deactivate: vi.fn(),
	refresh: vi.fn(),
	toastError: vi.fn(),
	loading: false,
}))

vi.mock('next/link', () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) => (
		<a href={href}>{children}</a>
	),
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: mocks.toastError } }))
vi.mock('../create-role-dialog', () => ({ CreateRoleDialog: () => null }))
vi.mock('../../hooks/use-roles', () => ({
	useRoles: () => ({
		refresh: mocks.refresh,
		state: mocks.loading
			? { status: 'loading', error: '', data: undefined }
			: {
			status: 'success',
			error: '',
			data: [
				{ id: 1, code: 'ADMIN', name: 'Administrador', description: null, isSystem: true, userCount: 2, permissionCount: 44 },
				{ id: 5, code: 'AUDITOR', name: 'Auditor', description: null, isSystem: false, userCount: 0, permissionCount: 3 },
			],
		},
	}),
}))
vi.mock('../../hooks/use-role-actions', () => ({
	useRoleActions: () => ({ deactivate: mocks.deactivate, pending: false }),
}))

import { RolesManager } from '../roles-manager'

beforeEach(() => {
	vi.clearAllMocks()
	mocks.loading = false
})

describe('RolesManager loading', () => {
	it('shows a labelled skeleton instead of the roles table while loading', () => {
		mocks.loading = true
		render(<RolesManager />)
		expect(screen.getByRole('status', { name: 'Cargando roles' })).toBeInTheDocument()
		expect(screen.queryByText('Cargando roles...')).not.toBeInTheDocument()
		expect(screen.queryByRole('table')).not.toBeInTheDocument()
	})
})

describe('RolesManager', () => {
	it('lists roles and offers deactivate only for non-system roles', () => {
		render(<RolesManager />)
		expect(screen.getByText('Administrador')).toBeInTheDocument()
		expect(screen.getAllByRole('button', { name: 'Desactivar' })).toHaveLength(1)
		expect(screen.getByRole('link', { name: 'Ver' })).toHaveAttribute('href', '/dashboard/admin/roles/1')
	})

	it('shows the server error when deactivation is refused', async () => {
		mocks.deactivate.mockResolvedValue({ ok: false, error: 'El rol tiene 3 usuario(s) activo(s)' })
		render(<RolesManager />)
		await userEvent.click(screen.getByRole('button', { name: 'Desactivar' }))
		await userEvent.click(screen.getAllByRole('button', { name: 'Desactivar' }).at(-1)!)
		expect(mocks.deactivate).toHaveBeenCalledWith(5)
		expect(mocks.toastError).toHaveBeenCalledWith('El rol tiene 3 usuario(s) activo(s)')
	})
})

describe('RolesManager search', () => {
	it('filters the list by name or code', async () => {
		render(<RolesManager />)
		await userEvent.type(screen.getByRole('textbox', { name: 'Buscar rol' }), 'audit')
		expect(screen.getByText('Auditor')).toBeInTheDocument()
		expect(screen.queryByText('Administrador')).not.toBeInTheDocument()
	})
})
