import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HistorialCargasTab } from '../components/HistorialCargasTab'
import { useFileHistory, type CargaHistorial } from '../hooks/use-file-history'
import { useAuthSession } from '@/features/shared/hooks/use-auth-session'
import { UserRole } from '@/features/auth/lib/roles'

vi.mock('../hooks/use-file-history')
vi.mock('@/features/shared/hooks/use-auth-session')
vi.mock('../lib/load-file-api', () => ({
	loadFileApi: {
		getImportHistory: vi.fn(),
		preliquidar: vi.fn(),
		deleteFileImport: vi.fn(),
	},
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
// Stub out heavy child components that need full providers
vi.mock('../components/RecordsByStatusView', () => ({
	RecordsByStatusView: () => null,
}))
vi.mock('@/features/shared/ui/modal', () => ({
	ConfirmModal: () => null,
	Modal: () => null,
}))

const mockUseFileHistory = vi.mocked(useFileHistory)
const mockUseAuthSession = vi.mocked(useAuthSession)

function makeCarga(overrides: Partial<CargaHistorial> = {}): CargaHistorial {
	return {
		id: '1',
		idFileImport: 42,
		nombreArchivo: 'SINCRONIZACION-POLIZA-ENERO-2026',
		fileType: 'POLIZA',
		estado: 'LOAD',
		fechaCarga: '2026-01-15',
		horaCarga: '10:00',
		usuario: 'John Doe',
		exitosos: 90,
		errores: 10,
		sincronizados: 5,
		rezagados: 2,
		sinRegistro: 3,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		createdAt: '2026-01-15T10:00:00Z',
		...overrides,
	}
}

function makeFileHistoryReturn(
	cargas: CargaHistorial[],
	overrides: Partial<ReturnType<typeof useFileHistory>> = {}
): ReturnType<typeof useFileHistory> {
	return {
		historial: cargas,
		isLoading: false,
		error: null,
		refetch: vi.fn(),
		deleteItem: vi.fn(),
		...overrides,
	}
}

describe('HistorialCargasTab — Preliquidar button visibility', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('does NOT render the Preliquidar button when sincronizados === 0', () => {
		mockUseAuthSession.mockReturnValue({
			user: { role: UserRole.ADMIN } as never,
			session: null as never,
			isLoading: false,
			isAuthenticated: true,
			isUnauthenticated: false,
			status: 'authenticated',
		})
		mockUseFileHistory.mockReturnValue(
			makeFileHistoryReturn([makeCarga({ sincronizados: 0, estado: 'LOAD' })])
		)

		render(<HistorialCargasTab />)

		expect(screen.queryByTitle('Pre-liquidar archivo')).toBeNull()
		expect(screen.queryByText('Preliquidar')).toBeNull()
	})

	it('does NOT render the Preliquidar button when estado !== "LOAD"', () => {
		mockUseAuthSession.mockReturnValue({
			user: { role: UserRole.ADMIN } as never,
			session: null as never,
			isLoading: false,
			isAuthenticated: true,
			isUnauthenticated: false,
			status: 'authenticated',
		})
		mockUseFileHistory.mockReturnValue(
			makeFileHistoryReturn([makeCarga({ sincronizados: 10, estado: 'COMPLETED' })])
		)

		render(<HistorialCargasTab />)

		expect(screen.queryByTitle('Pre-liquidar archivo')).toBeNull()
		expect(screen.queryByText('Preliquidar')).toBeNull()
	})

	it('does NOT render the Preliquidar button for roles without liquidaciones.preliquidacion permission', () => {
		// AGENTE has preliquidacion: false
		mockUseAuthSession.mockReturnValue({
			user: { role: UserRole.AGENTE } as never,
			session: null as never,
			isLoading: false,
			isAuthenticated: true,
			isUnauthenticated: false,
			status: 'authenticated',
		})
		mockUseFileHistory.mockReturnValue(
			makeFileHistoryReturn([makeCarga({ sincronizados: 5, estado: 'LOAD' })])
		)

		render(<HistorialCargasTab />)

		expect(screen.queryByTitle('Pre-liquidar archivo')).toBeNull()
		expect(screen.queryByText('Preliquidar')).toBeNull()
	})

	it('RENDERS the Preliquidar button when sincronizados > 0, estado === "LOAD", and role has permission (ADMIN)', () => {
		mockUseAuthSession.mockReturnValue({
			user: { role: UserRole.ADMIN } as never,
			session: null as never,
			isLoading: false,
			isAuthenticated: true,
			isUnauthenticated: false,
			status: 'authenticated',
		})
		mockUseFileHistory.mockReturnValue(
			makeFileHistoryReturn([makeCarga({ sincronizados: 5, estado: 'LOAD' })])
		)

		render(<HistorialCargasTab />)

		expect(screen.getByTitle('Pre-liquidar archivo')).toBeTruthy()
		expect(screen.getByText('Preliquidar')).toBeTruthy()
	})

	it('RENDERS the Preliquidar button for ASISTENTE_GERENCIA_OPERATIVA role', () => {
		mockUseAuthSession.mockReturnValue({
			user: { role: UserRole.ASISTENTE_GERENCIA_OPERATIVA } as never,
			session: null as never,
			isLoading: false,
			isAuthenticated: true,
			isUnauthenticated: false,
			status: 'authenticated',
		})
		mockUseFileHistory.mockReturnValue(
			makeFileHistoryReturn([makeCarga({ sincronizados: 3, estado: 'LOAD' })])
		)

		render(<HistorialCargasTab />)

		expect(screen.getByTitle('Pre-liquidar archivo')).toBeTruthy()
	})

	it('does NOT render the Preliquidar button when user is null', () => {
		mockUseAuthSession.mockReturnValue({
			user: undefined,
			session: null as never,
			isLoading: false,
			isAuthenticated: false,
			isUnauthenticated: true,
			status: 'unauthenticated',
		})
		mockUseFileHistory.mockReturnValue(
			makeFileHistoryReturn([makeCarga({ sincronizados: 5, estado: 'LOAD' })])
		)

		render(<HistorialCargasTab />)

		expect(screen.queryByTitle('Pre-liquidar archivo')).toBeNull()
	})
})
