import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useSession } from 'next-auth/react'
import { AppSidebar } from '../Sidebar'
import { SidebarProvider } from '@/features/shared/ui/sidebar'
import { UserRole } from '@/features/auth/lib/roles'
import { getRolePermissions } from '@/features/auth/lib/permissions'

vi.mock('next-auth/react', () => ({
	useSession: vi.fn(),
}))

vi.mock('@/features/shared/hooks/use-feature-flag', () => ({
	useFeatureFlag: () => ({ enabled: true, value: null }),
}))

beforeEach(() => {
	// jsdom does not implement matchMedia — the sidebar's mobile-breakpoint
	// hook (useIsMobile) needs it to mount at all.
	window.matchMedia = vi.fn().mockImplementation((query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})) as never
})

function renderSidebar() {
	return render(
		<SidebarProvider>
			<AppSidebar />
		</SidebarProvider>
	)
}

describe('AppSidebar', () => {
	it('shows menu skeletons (not a blank sidebar) while the session is loading', () => {
		vi.mocked(useSession).mockReturnValue({
			data: null,
			status: 'loading',
			update: vi.fn(),
		} as never)

		renderSidebar()

		// No real nav item should render yet — they depend on the resolved role.
		expect(screen.queryByRole('link', { name: /negocios/i })).not.toBeInTheDocument()
		// But the sidebar body must show loading placeholders, not an empty gap.
		expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0)
	})

	it('renders the real role-based menu once the session resolves', () => {
		vi.mocked(useSession).mockReturnValue({
			data: {
				user: {
					role: UserRole.ADMIN,
					permissions: getRolePermissions(UserRole.ADMIN),
				},
			},
			status: 'authenticated',
			update: vi.fn(),
		} as never)

		renderSidebar()

		expect(screen.getByRole('link', { name: /negocios/i })).toBeInTheDocument()
		expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument()
	})
})
