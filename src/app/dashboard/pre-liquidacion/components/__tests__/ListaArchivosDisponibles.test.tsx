import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ListaArchivosDisponibles } from '../ListaArchivosDisponibles'
import type { ArchivoDisponible } from '@/features/pre-liquidacion/types/types'

vi.mock('next/navigation', () => ({
	useRouter: () => ({ push: vi.fn() }),
}))

const baseFile: ArchivoDisponible = {
	idFileImport: 1,
	nombreArchivo: 'partners.xlsx',
	usuarioCargo: 'Ana',
	fechaCarga: '2026-10-01',
	cantidadRegistros: 2,
	totalRegistros: 2,
	sincronizados: 0,
	rezagados: 0,
	estado: 'LOAD',
	registrosPreliquidados: 0,
	fileType: 'POLIZA',
}

describe('ListaArchivosDisponibles - partner-only files', () => {
	it('offers Pre-Liquidar for a LOAD file that only has excluded rows', () => {
		render(
			<ListaArchivosDisponibles archivos={[{ ...baseFile, excluidos: 2 }]} />
		)
		expect(
			screen.getByRole('button', { name: /pre-liquidar/i })
		).toBeInTheDocument()
	})

	it('shows no action for a LOAD file without any actionable rows', () => {
		render(
			<ListaArchivosDisponibles archivos={[{ ...baseFile, excluidos: 0 }]} />
		)
		expect(
			screen.queryByRole('button', { name: /pre-liquidar/i })
		).not.toBeInTheDocument()
	})
})
