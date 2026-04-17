import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FileImportCard } from '../components/FileImportCard'
import type { CargaHistorial } from '../hooks/use-file-history'

function makeCarga(overrides: Partial<CargaHistorial> = {}): CargaHistorial {
	return {
		id: '1',
		idFileImport: 1,
		nombreArchivo: 'test.xlsx',
		fileType: 'POLIZA',
		estado: 'LOAD',
		fechaCarga: '2026-01-15',
		horaCarga: '10:00',
		usuario: 'Test User',
		exitosos: 1,
		errores: 0,
		sincronizados: 0,
		sinRegistro: 0,
		rezagados: 0,
		createdAt: '2026-01-15T10:00:00Z',
		...overrides,
	}
}

const noop = vi.fn()

describe('FileImportCard — delete visibility (REQ-4)', () => {
	it('hides delete when canDelete=false for PRE-SETTLED', () => {
		render(
			<FileImportCard
				carga={makeCarga({ estado: 'PRE-SETTLED' })}
				canDelete={false}
				canPreliquidar={false}
				onDelete={noop}
				onViewDetail={noop}
				onGoToPreliquidacion={noop}
			/>
		)

		expect(screen.queryByTitle('Eliminar registro')).toBeNull()
	})

	it('hides delete when canDelete=false for COMPLETED', () => {
		render(
			<FileImportCard
				carga={makeCarga({ estado: 'COMPLETED' })}
				canDelete={false}
				canPreliquidar={false}
				onDelete={noop}
				onViewDetail={noop}
			/>
		)

		expect(screen.queryByTitle('Eliminar registro')).toBeNull()
	})

	it('shows delete when canDelete=true for LOAD', () => {
		render(
			<FileImportCard
				carga={makeCarga({ estado: 'LOAD' })}
				canDelete
				canPreliquidar={false}
				onDelete={noop}
				onViewDetail={noop}
			/>
		)

		expect(screen.getByTitle('Eliminar registro')).toBeInTheDocument()
	})
})
