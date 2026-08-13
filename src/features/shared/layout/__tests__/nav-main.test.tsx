import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { usePathname } from 'next/navigation'
import { NavMain, type NavItem } from '../nav-main'
import { SidebarProvider } from '@/features/shared/ui/sidebar'

vi.mock('next/navigation', () => ({
	usePathname: vi.fn(),
}))

beforeEach(() => {
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

const items: NavItem[] = [
	{
		title: 'Administración',
		url: '/dashboard/admin',
		subItems: [
			{ title: 'Compañías', url: '/dashboard/admin/companies' },
			{ title: 'Productos', url: '/dashboard/products' },
		],
	},
	{
		title: 'Reportes',
		url: '/dashboard/reportes',
		subItems: [
			{ title: 'Todos los Reportes', url: '/dashboard/reportes' },
			{ title: 'Mis Reportes', url: '/dashboard/reportes/personales' },
		],
	},
]

function renderNav(pathname: string) {
	vi.mocked(usePathname).mockReturnValue(pathname)
	return render(
		<SidebarProvider>
			<NavMain items={items} />
		</SidebarProvider>
	)
}

describe('NavMain', () => {
	it('keeps a manually-opened collapsible open after navigating to a link inside a different collapsible', () => {
		const { rerender } = renderNav('/dashboard/reportes')

		// Manually open "Administración" (its active route is elsewhere).
		fireEvent.click(screen.getByRole('button', { name: /administración/i }))
		expect(screen.getByRole('link', { name: /compañías/i })).toBeInTheDocument()

		// Navigate to a sub-item under "Reportes" (a different collapsible).
		vi.mocked(usePathname).mockReturnValue('/dashboard/reportes/personales')
		rerender(
			<SidebarProvider>
				<NavMain items={items} />
			</SidebarProvider>
		)

		// "Administración" must remain open — the user did not close it.
		expect(screen.getByRole('link', { name: /compañías/i })).toBeInTheDocument()
		// "Reportes" auto-opens because it now contains the active route.
		expect(screen.getByRole('link', { name: /mis reportes/i })).toBeInTheDocument()
	})
})
