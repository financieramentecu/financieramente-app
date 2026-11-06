import React, { useState } from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/features/shared/ui/DataTable/DataTable'
import { getBusinessRowId } from '../../components/BusinessTableSection'
import type { Business } from '../../types/business.types'

type Row = Pick<Business, 'id' | 'clientName'>

/** Mimics BusinessRowActions: local "modal open" state captured per row. */
function RowActionCell({ businessId }: { businessId: string }) {
	const [open, setOpen] = useState(false)
	return (
		<>
			<button type="button" onClick={() => setOpen(true)}>
				open-{businessId}
			</button>
			{open && <span data-testid="open-modal">modal-for-{businessId}</span>}
		</>
	)
}

const columns: ColumnDef<Row>[] = [
	{ accessorKey: 'clientName', header: 'Cliente' },
	{
		id: 'actions',
		header: 'Acciones',
		cell: ({ row }) => <RowActionCell businessId={row.original.id} />,
	},
]

const skandia: Row = { id: '10', clientName: 'Skandia' }
const manhattan: Row = { id: '30', clientName: 'Manhattan' }

describe('Business table row identity', () => {
	it('getBusinessRowId returns the business id', () => {
		expect(getBusinessRowId({ id: '42' } as Business)).toBe('42')
	})

	it('keeps row-level modal state on the same business after the list reorders', async () => {
		const user = userEvent.setup()
		const { rerender } = render(
			<DataTable columns={columns} data={[skandia, manhattan]} getRowId={getBusinessRowId} />,
		)

		await user.click(screen.getByRole('button', { name: 'open-10' }))
		expect(screen.getByTestId('open-modal')).toHaveTextContent('modal-for-10')

		// Refetch returns the same businesses in a different order
		rerender(
			<DataTable columns={columns} data={[manhattan, skandia]} getRowId={getBusinessRowId} />,
		)

		expect(screen.getByTestId('open-modal')).toHaveTextContent('modal-for-10')
	})
})
