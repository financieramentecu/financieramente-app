import { describe, it, expect, vi } from 'vitest'

vi.mock('next/font/google', () => ({
	Inter: () => ({ variable: '--font-inter', className: 'font-inter' }),
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

describe('RootLayout', () => {
	it('renders its children inside the auth provider alongside the toaster', () => {
		render(RootLayout({ children: <div data-testid="child">content</div> }))

		expect(screen.getByTestId('auth-provider')).toContainElement(
			screen.getByTestId('child')
		)
		expect(screen.getByTestId('toaster')).toBeInTheDocument()
	})
})
