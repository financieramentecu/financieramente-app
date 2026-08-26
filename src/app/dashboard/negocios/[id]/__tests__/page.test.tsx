import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import DetalleNegocioPage from '@/app/dashboard/negocios/[id]/page'
import { getBusinessById } from '@/features/negocios/services/business-get-by-id.server'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { prismaBusinessToEntity } from '@/features/negocios/mappers/business-entity.mapper'
import { UserRole } from '@/features/auth/lib/roles'
import { BUSINESS_STATUS } from '@/features/negocios/types/business-entity.types'

vi.mock('next/navigation', () => ({
	redirect: vi.fn(),
	notFound: vi.fn(),
}))

vi.mock('@/auth', () => ({
	auth: vi.fn().mockResolvedValue({ user: { email: 'user@financieramentecu.com' } }),
}))

vi.mock('@/features/negocios/services/business-get-by-id.server', () => ({
	getBusinessById: vi.fn().mockResolvedValue({}),
}))
vi.mock('@/features/negocios/services/user.service', () => ({
	getCurrentUserByEmail: vi.fn(),
}))
vi.mock('@/features/negocios/mappers/business-entity.mapper', () => ({
	prismaBusinessToEntity: vi.fn(),
}))

vi.mock('@/features/shared/layout/DashboardLayout', () => ({
	DashboardLayout: (props: { children?: React.ReactNode }) => (
		<div>{props.children}</div>
	),
}))
vi.mock('@/features/negocios/components/ui/BusinessStatusBadge', () => ({
	BusinessStatusBadge: () => null,
}))
vi.mock('@/features/negocios/components/ui/BusinessNovedadBadge', () => ({
	BusinessNovedadBadge: () => null,
}))
vi.mock('@/features/negocios/components/ui/NovedadActionButton', () => ({
	NovedadActionButton: () => (
		<button>Marcar Con Novedad</button>
	),
}))
vi.mock('@/features/negocios/components/ui/NovedadManageTrigger', () => ({
	NovedadManageTrigger: () => null,
}))
vi.mock('@/features/negocios/components/ui/UserAvatar', () => ({
	UserAvatar: () => null,
}))
vi.mock('@/features/business-supports/components/ViewSupportsButton', () => ({
	ViewSupportsButton: () => <button>Ver Soportes</button>,
}))
vi.mock('@/features/business-supports/components/UploadSupportButton', () => ({
	UploadSupportButton: () => <button>Subir Soporte</button>,
}))
vi.mock('@/features/comments/components/CommentsSidebar', () => ({
	CommentsSidebar: (props: { readOnly?: boolean }) => (
		<div data-testid="comments-sidebar" data-readonly={String(!!props.readOnly)} />
	),
}))

function currentUserWithRole(role: UserRole) {
	return {
		idUser: 1,
		email: 'user@financieramentecu.com',
		name: 'Test User',
		role: { code: role, name: role },
	}
}

const baseBusiness = {
	id: 42,
	status: BUSINESS_STATUS.VENTA_EFECTUADA,
	novedadStatus: null,
	novedadMarkedAt: null,
	createdAt: '2026-01-01T00:00:00.000Z',
	value: 1000,
	currency: { name: 'COP' },
	client: {
		fullName: 'Cliente Test',
		identityNumber: 'CC 123',
		email: null,
		phone: null,
	},
	agent: {
		fullName: 'Agente Test',
		roleName: null,
		email: 'agente@test.com',
		phone: null,
	},
	product: { name: 'Producto', companyName: 'Compañía' },
	term: null,
	periodicity: null,
	contract: 'CON-001',
	clientOrigin: { name: 'Origen' },
	dateIssued: null,
	numAportes: null,
	fundedAportes: null,
}

describe('DetalleNegocioPage — CONSULTOR read-only actions', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(getBusinessById).mockResolvedValue({} as never)
		vi.mocked(prismaBusinessToEntity).mockReturnValue(baseBusiness as never)
	})

	it('hides "Editar", "Subir Soporte" and novedad action for CONSULTOR', async () => {
		vi.mocked(getCurrentUserByEmail).mockResolvedValue(
			currentUserWithRole(UserRole.CONSULTOR) as never
		)

		const page = await DetalleNegocioPage({
			params: Promise.resolve({ id: '42' }),
			searchParams: Promise.resolve({}),
		})
		render(page)

		expect(screen.queryByRole('link', { name: /editar/i })).not.toBeInTheDocument()
		expect(
			screen.queryByRole('button', { name: /subir soporte/i })
		).not.toBeInTheDocument()
		expect(
			screen.queryByRole('button', { name: /marcar con novedad/i })
		).not.toBeInTheDocument()
		expect(screen.getByTestId('comments-sidebar')).toHaveAttribute(
			'data-readonly',
			'true'
		)
		// Read actions stay visible
		expect(
			screen.getByRole('button', { name: /ver soportes/i })
		).toBeInTheDocument()
	})

	it('keeps "Editar", "Subir Soporte" and novedad action visible for ADMIN', async () => {
		vi.mocked(getCurrentUserByEmail).mockResolvedValue(
			currentUserWithRole(UserRole.ADMIN) as never
		)

		const page = await DetalleNegocioPage({
			params: Promise.resolve({ id: '42' }),
			searchParams: Promise.resolve({}),
		})
		render(page)

		expect(screen.getByRole('link', { name: /editar/i })).toBeInTheDocument()
		expect(
			screen.getByRole('button', { name: /subir soporte/i })
		).toBeInTheDocument()
		expect(
			screen.getByRole('button', { name: /marcar con novedad/i })
		).toBeInTheDocument()
		expect(screen.getByTestId('comments-sidebar')).toHaveAttribute(
			'data-readonly',
			'false'
		)
	})
})
