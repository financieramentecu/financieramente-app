import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
	useParams: () => ({ id: '4' }),
	useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}))
vi.mock('@/features/shared/layout/DashboardLayout', () => ({
	DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
vi.mock('@/features/admin/users/hooks/use-user', () => ({
	useUser: () => ({ user: null, isLoading: true, error: null, refreshUser: vi.fn() }),
}))
vi.mock('@/features/admin/users/hooks/use-user-mutations', () => ({
	useUserMutations: () => ({ updateUser: vi.fn(), isSubmitting: false }),
}))

import UserDetailPage from '../page'

describe('UserDetailPage loading', () => {
	it('shows a labelled skeleton instead of a spinner while the user loads', () => {
		render(<UserDetailPage />)
		expect(screen.getByRole('status', { name: 'Cargando usuario' })).toBeInTheDocument()
		expect(
			screen.queryByText('Cargando información del usuario...')
		).not.toBeInTheDocument()
	})
})
