import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/features/shared/ui/tooltip', () => ({
	TooltipProvider: ({ children }: { children: React.ReactNode }) => (
		<>{children}</>
	),
	Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	TooltipTrigger: ({
		children,
	}: {
		children: React.ReactNode
		asChild?: boolean
	}) => <>{children}</>,
	TooltipContent: ({ children }: { children: React.ReactNode }) => (
		<div role="tooltip">{children}</div>
	),
}))

const mockUseReadOnlyRole = vi.fn()
vi.mock('@/features/shared/hooks/use-read-only-role', () => ({
	useReadOnlyRole: () => mockUseReadOnlyRole(),
}))

import { ReadOnlyAction } from '../read-only-action'

describe('ReadOnlyAction', () => {
	it('renders children untouched when the role is not read-only', () => {
		mockUseReadOnlyRole.mockReturnValue({ isReadOnly: false, reason: '' })

		render(
			<ReadOnlyAction>
				<button>Exportar</button>
			</ReadOnlyAction>
		)

		expect(
			screen.getByRole('button', { name: 'Exportar' })
		).toBeInTheDocument()
		expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
	})

	it('wraps children in a focusable span with a tooltip when the role is read-only', () => {
		mockUseReadOnlyRole.mockReturnValue({
			isReadOnly: true,
			reason: 'Solo lectura: tu rol no permite esta acción',
		})

		render(
			<ReadOnlyAction>
				<button disabled>Exportar</button>
			</ReadOnlyAction>
		)

		expect(
			screen.getByText('Solo lectura: tu rol no permite esta acción')
		).toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'Exportar' })).toBeDisabled()
	})
})
