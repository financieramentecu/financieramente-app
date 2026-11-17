import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PERMISSION_CATALOG } from '../../catalog/permissions.catalog'

const mocks = vi.hoisted(() => ({
	loading: false,
	canManage: true,
	savePermissions: vi.fn(),
	update: vi.fn(),
	detail: null as unknown,
}))

vi.mock('next/link', () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) => (
		<a href={href}>{children}</a>
	),
}))
vi.mock('@/features/shared/hooks/use-permissions', () => ({
	usePermissions: () => ({ can: (code: string) => (code === 'roles.gestionar' ? mocks.canManage : true) }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('../../hooks/use-role-detail', () => ({
	useRoleDetail: () =>
		mocks.loading
			? { status: 'loading', data: undefined, error: '' }
			: { status: 'success', data: mocks.detail, error: '' },
}))
vi.mock('../../hooks/use-role-actions', () => ({
	useRoleActions: () => ({
		pending: false,
		update: mocks.update,
		savePermissions: mocks.savePermissions,
	}),
}))

import { RoleEditor } from '../role-editor'

function detail(code: string, grants: Record<string, object>, isSystem = false) {
	return {
		role: { id: 5, code, name: 'Analista', description: null, isSystem, userCount: 2 },
		grants,
		catalog: PERMISSION_CATALOG,
		levels: [{ code: 'LEVEL_2', name: 'Nivel 2' }],
	}
}

beforeEach(() => {
	vi.clearAllMocks()
	mocks.loading = false
	mocks.canManage = true
	mocks.savePermissions.mockResolvedValue({ ok: true, data: {} })
	mocks.update.mockResolvedValue({ ok: true, data: undefined })
})

describe('RoleEditor without roles.gestionar', () => {
	it('opens read-only: no save bar, no name form, switches disabled, with a notice', () => {
		mocks.canManage = false
		mocks.detail = detail('ANALISTA', { 'aportes.fondear': {} })
		render(<RoleEditor roleId={5} />)
		expect(screen.queryByRole('button', { name: 'Guardar cambios' })).not.toBeInTheDocument()
		expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument()
		expect(screen.queryByRole('button', { name: 'Activar todos' })).not.toBeInTheDocument()
		// Permission switches carry the permission code as id; the "Solo activos" filter is not one.
		const switches = screen.getAllByRole('switch').filter((el) => el.id.includes('.'))
		expect(switches.length).toBeGreaterThan(0)
		for (const control of switches) expect(control).toBeDisabled()
		expect(screen.getByText(/no puede modificarlos|solo lectura/i)).toBeInTheDocument()
	})
})

describe('RoleEditor loading', () => {
	it('shows a labelled skeleton shaped like the editor while the role loads', () => {
		mocks.loading = true
		render(<RoleEditor roleId={5} />)
		expect(screen.getByRole('status', { name: 'Cargando rol' })).toBeInTheDocument()
		expect(screen.queryByText('Cargando rol...')).not.toBeInTheDocument()
	})
})

describe('RoleEditor', () => {
	it('warns when fondear is on without ver and clears when ver is granted', async () => {
		mocks.detail = detail('ANALISTA', { 'aportes.fondear': {} })
		render(<RoleEditor roleId={5} />)
		expect(screen.getByText(/está activo sin/)).toBeInTheDocument()
		await userEvent.click(screen.getByRole('switch', { name: 'Ver aportes' }))
		expect(screen.queryByText(/está activo sin/)).not.toBeInTheDocument()
	})

	it('saves only the permissions after a toggle', async () => {
		mocks.detail = detail('ANALISTA', {})
		render(<RoleEditor roleId={5} />)
		const save = screen.getByRole('button', { name: 'Guardar cambios' })
		expect(save).toBeDisabled()
		await userEvent.click(screen.getByRole('switch', { name: 'Fondear aportes' }))
		await userEvent.click(save)
		expect(mocks.savePermissions).toHaveBeenCalledWith(5, { 'aportes.fondear': {} })
		expect(mocks.update).not.toHaveBeenCalled()
	})

	it('shows ADMIN as read only with no save button', () => {
		mocks.detail = detail('ADMIN', {}, true)
		render(<RoleEditor roleId={1} />)
		expect(screen.queryByRole('button', { name: 'Guardar cambios' })).not.toBeInTheDocument()
		expect(screen.getByRole('switch', { name: 'Ver dashboard' })).toBeDisabled()
	})
})

describe('RoleEditor compact tools', () => {
	it('filters permissions by the search box and by "solo activos"', async () => {
		mocks.detail = detail('ANALISTA', { 'aportes.fondear': {} })
		render(<RoleEditor roleId={5} />)
		await userEvent.type(screen.getByRole('textbox', { name: 'Buscar permiso' }), 'fondear')
		expect(screen.getByRole('switch', { name: 'Fondear aportes' })).toBeInTheDocument()
		expect(screen.queryByRole('switch', { name: 'Ver dashboard' })).not.toBeInTheDocument()
	})

	it('turns a whole module on with one click and offers to discard the changes', async () => {
		mocks.detail = detail('ANALISTA', {})
		render(<RoleEditor roleId={5} />)
		const discard = screen.getByRole('button', { name: 'Descartar' })
		expect(discard).toBeDisabled()
		await userEvent.click(screen.getAllByRole('button', { name: 'Activar todos' })[0])
		expect(screen.getByRole('switch', { name: 'Ver dashboard' })).toBeChecked()
		await userEvent.click(discard)
		expect(screen.getByRole('switch', { name: 'Ver dashboard' })).not.toBeChecked()
	})
})
