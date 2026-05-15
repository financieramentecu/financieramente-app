import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BusinessTableSection } from '@/features/negocios/components/BusinessTableSection'

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

vi.mock('@/features/shared/ui/select', () => ({
	Select: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="mock-select">{children}</div>
	),
	SelectTrigger: ({ children }: { children: React.ReactNode }) => (
		<button type="button">{children}</button>
	),
	SelectValue: ({ placeholder }: { placeholder?: string }) => (
		<span>{placeholder ?? ''}</span>
	),
	SelectContent: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	SelectItem: ({
		children,
		value,
	}: {
		children: React.ReactNode
		value: string
	}) => <div data-value={value}>{children}</div>,
}))

describe('BusinessTableSection status filter options', () => {
	it('includes Liquidado and excludes Comisionando', () => {
		render(
			<BusinessTableSection
				data={[]}
				onAddBusiness={vi.fn()}
				onEditBusiness={vi.fn()}
				onListStatusChange={vi.fn()}
			/>
		)

		expect(
			screen.getByText('Liquidado', {
				selector: '[data-value="LIQUIDADO"]',
			})
		).toBeInTheDocument()
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
