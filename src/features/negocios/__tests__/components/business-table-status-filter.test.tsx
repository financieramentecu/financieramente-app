import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render as rtlRender, screen } from '@testing-library/react'
import {
	setMockRole,
	roleFromElement,
} from '@/features/access-control/testing/mock-permissions'
import { BusinessTableSection } from '@/features/negocios/components/BusinessTableSection'

vi.mock('@/features/shared/hooks/use-permissions', async () => ({
	usePermissions: (
		await import('@/features/access-control/testing/mock-permissions')
	).mockedUsePermissions,
}))

const render = (...args: Parameters<typeof rtlRender>) => {
	setMockRole(roleFromElement(args[0]))
	return rtlRender(...args)
}


vi.mock('@/features/shared/ui/DataTable/DataTable', () => ({
	DataTable: ({
		columns,
		data,
		renderAdditionalFilters,
	}: {
		columns?: Array<{
			accessorKey?: string
			header?: (props: { column: unknown }) => React.ReactNode
			cell?: (props: { row: { original: unknown; getValue: (key: string) => unknown } }) => React.ReactNode
		}>
		data?: Array<Record<string, unknown>>
		renderAdditionalFilters?: () => React.ReactNode
	}) => (
		<div>
			{columns?.map((column, index) => (
				<div key={`${String(column.accessorKey)}-${index}`}>
					{typeof column.header === 'function'
						? column.header({ column: {} })
						: column.header}
				</div>
			))}
			{columns
				?.filter((column) => column.accessorKey === 'status')
				.map((column, index) => (
					<div key={`status-cell-${index}`}>
						{column.cell?.({
							row: {
								original:
									data?.[0] ??
									({
										statusCode: 'LIQUIDADO',
									} as unknown as Record<string, unknown>),
								getValue: () => 'LIQUIDADO',
							},
						})}
					</div>
				))}
			{renderAdditionalFilters ? renderAdditionalFilters() : null}
		</div>
	),
}))

vi.mock('@/features/shared/ui/DataTable/DataTableColumnHeader', () => ({
	DataTableColumnHeader: ({ title }: { title: string }) => <span>{title}</span>,
}))

vi.mock('@/features/negocios/components/AdvancedFiltersSheet', () => ({
	AdvancedFiltersSheet: () => <button data-testid="advanced-filters-sheet">Filtros avanzados</button>,
}))

vi.mock('next/navigation', () => ({
	useRouter: () => ({ replace: vi.fn() }),
	useSearchParams: () => new URLSearchParams(),
}))

describe('BusinessTableSection status filter options', () => {
	it('renders AdvancedFiltersSheet in the toolbar (inline status filter removed)', () => {
		render(
			<BusinessTableSection
				data={[]}
				onAddBusiness={vi.fn()}
				onEditBusiness={vi.fn()}
			/>
		)

		// The inline status Select is gone; AdvancedFiltersSheet replaces it
		expect(screen.getByTestId('advanced-filters-sheet')).toBeInTheDocument()
		// Verify no legacy inline filter items (Comisionando never existed)
		expect(screen.queryByText('Comisionando')).not.toBeInTheDocument()
	})

	it('renders "Creación" as the creation column header', () => {
		render(
			<BusinessTableSection
				data={[]}
				onAddBusiness={vi.fn()}
				onEditBusiness={vi.fn()}
			/>
		)

		expect(screen.getByText('Creación')).toBeInTheDocument()
	})
})
