import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/nextauth', () => ({ auth: vi.fn() }))
vi.mock('../../services/liquidacion.service', () => ({
	obtenerComisionesLiquidadas: vi.fn().mockResolvedValue([{ id: 1 }]),
	obtenerTodosLosContratos: vi.fn().mockResolvedValue(['C-1']),
	obtenerTodosLosCoaches: vi.fn().mockResolvedValue([{ id: 2 }]),
}))

import { auth } from '@/lib/auth/nextauth'
import {
	obtenerComisionesLiquidadas,
	obtenerTodosLosContratos,
	obtenerTodosLosCoaches,
} from '../../services/liquidacion.service'
import {
	fetchComisionesLiquidadasAction,
	fetchContratosAction,
	fetchCoachesAction,
} from '../liquidacion.actions'

const calls = [
	[
		'fetchComisionesLiquidadasAction',
		() => fetchComisionesLiquidadasAction({}),
		obtenerComisionesLiquidadas,
	],
	[
		'fetchContratosAction',
		() => fetchContratosAction(),
		obtenerTodosLosContratos,
	],
	['fetchCoachesAction', () => fetchCoachesAction(), obtenerTodosLosCoaches],
] as const

beforeEach(() => {
	vi.clearAllMocks()
})

describe.each(calls)('%s guard', (_name, invoke, service) => {
	it.each(['PARTNER', 'DEFAULT', 'SOMETHING_NEW'])(
		'refuses %s and never queries',
		async (role) => {
			vi.mocked(auth).mockResolvedValue({ user: { role } } as never)
			const result = await invoke()
			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBe('Sin permisos')
			expect(service).not.toHaveBeenCalled()
		}
	)

	it('refuses an anonymous caller', async () => {
		vi.mocked(auth).mockResolvedValue(null as never)
		const result = await invoke()
		expect(result.data).toBeNull()
		expect('error' in result && result.error).toBe('No autorizado')
		expect(service).not.toHaveBeenCalled()
	})

	it.each([
		'ADMIN',
		'ASISTENTE_GERENCIA_OPERATIVA',
		'ANALISTA_SOPORTE',
		'AGENTE',
		'CONSULTOR',
	])("lets %s through (internal roles keep today's behavior)", async (role) => {
		vi.mocked(auth).mockResolvedValue({ user: { role } } as never)
		const result = await invoke()
		expect(result.data).not.toBeNull()
		expect(service).toHaveBeenCalled()
	})
})
