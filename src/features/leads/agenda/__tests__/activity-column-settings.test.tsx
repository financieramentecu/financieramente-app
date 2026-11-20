import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { toast } from 'sonner'
import { ActivityColumnSettings } from '@/features/leads/agenda/activity-column-settings'
import type { ActivityColumn } from '@/features/leads/agenda/activity-column.types'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const columns: ActivityColumn[] = [
	{ code: 'overdue', name: 'Vencidas', position: 0, system: true },
	{ code: 'xabc', name: 'Seguimiento', position: 4, system: false },
]

function renderSettings(onSave = vi.fn(async () => true), onAdd = vi.fn(async () => true), onRemove = vi.fn(async () => true)) {
	render(
		<ActivityColumnSettings
			state={{ status: 'success', data: columns, error: '' }}
			actionError={null}
			onSave={onSave}
			onAdd={onAdd}
			onRemove={onRemove}
		/>
	)
	fireEvent.click(screen.getByRole('button', { name: 'Columnas' }))
	return { onSave, onAdd, onRemove }
}

describe('ActivityColumnSettings', () => {
	it('confirms when a column name, and therefore the task or case state, is saved', async () => {
		const { onSave } = renderSettings()
		const row = screen.getByLabelText('Columna Vencidas').closest('li')
		if (!row) throw new Error('missing column row')
		fireEvent.change(screen.getByLabelText('Columna Vencidas'), { target: { value: 'Atrasadas' } })
		fireEvent.click(within(row).getByRole('button', { name: 'Guardar' }))
		await waitFor(() => expect(onSave).toHaveBeenCalledWith('overdue', 'Atrasadas'))
		expect(toast.success).toHaveBeenCalledWith('Columna actualizada', { description: 'El estado ahora es Atrasadas.' })
	})

	it('confirms when a column is added or removed', async () => {
		const { onAdd, onRemove } = renderSettings()
		fireEvent.change(screen.getByLabelText('Nueva columna'), { target: { value: 'En revisión' } })
		fireEvent.click(screen.getByRole('button', { name: 'Agregar' }))
		await waitFor(() => expect(onAdd).toHaveBeenCalledWith('En revisión'))
		expect(toast.success).toHaveBeenCalledWith('Columna agregada', { description: 'En revisión ya es un estado del tablero.' })

		fireEvent.click(screen.getByRole('button', { name: 'Eliminar columna Seguimiento' }))
		await waitFor(() => expect(onRemove).toHaveBeenCalledWith('xabc'))
		expect(toast.success).toHaveBeenCalledWith('Columna eliminada')
	})
})
