import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock server-only modules
vi.mock('@/features/shared/lib/flagsmith-server', () => ({
	getFlagsmithServerState: vi.fn(),
}))

vi.mock('@/features/shared/providers/flagsmith-provider', () => ({
	FlagsmithProvider: ({ children, serverState }: { children: React.ReactNode; serverState: string }) => (
		<div data-testid="flagsmith-provider" data-server-state={serverState}>
			{children}
		</div>
	),
}))

vi.mock('@/features/shared/providers/auth-provider', () => ({
	AuthProvider: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="auth-provider">{children}</div>
	),
}))

vi.mock('@/features/shared/ui/ThemeProvider', () => ({
	ThemeProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/features/shared/ui/sonner', () => ({
	Toaster: () => <div data-testid="toaster" />,
}))

import React from 'react'
import { render, screen } from '@testing-library/react'
import RootLayout from '../layout'
import { getFlagsmithServerState } from '@/features/shared/lib/flagsmith-server'

describe('RootLayout', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('renders without throwing when getFlagsmithServerState resolves', async () => {
		const mockState = JSON.stringify({ api: 'https://edge.api.flagsmith.com/api/v1/', flags: {} })
		;(getFlagsmithServerState as ReturnType<typeof vi.fn>).mockResolvedValue(mockState)

		const jsx = await RootLayout({ children: <div data-testid="child">content</div> })
		render(jsx)

		expect(screen.getByTestId('child')).toBeInTheDocument()
	})

	it('passes a non-empty serverState string to FlagsmithProvider', async () => {
		const mockState = JSON.stringify({
			api: 'https://edge.api.flagsmith.com/api/v1/',
			flags: { negocios_advanced_filters: { enabled: true, value: null } },
		})
		;(getFlagsmithServerState as ReturnType<typeof vi.fn>).mockResolvedValue(mockState)

		const jsx = await RootLayout({ children: <span>test</span> })
		render(jsx)

		const provider = screen.getByTestId('flagsmith-provider')
		const passedState = provider.getAttribute('data-server-state')
		expect(passedState).toBeTruthy()
		expect(passedState).toBe(mockState)
	})
})
