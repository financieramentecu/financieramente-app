import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isValidElement, type ReactElement, type ReactNode } from 'react'

const { mockAuth, mockLevelFindMany } = vi.hoisted(() => ({
	mockAuth: vi.fn(),
	mockLevelFindMany: vi.fn(),
}))

vi.mock('@/auth', () => ({ auth: mockAuth }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/features/shared/lib/flagsmith-server', () => ({
	isFeatureEnabledServer: vi.fn().mockResolvedValue(true),
}))
vi.mock('@/features/shared/layout/DashboardLayout', () => ({
	DashboardLayout: ({ children }: { children: ReactNode }) => children,
}))
vi.mock('@/features/calculadora/components/calculadora-client', () => ({
	CalculadoraClient: () => null,
}))
vi.mock('@/lib/prisma', () => ({
	prisma: {
		user: { findUnique: vi.fn().mockResolvedValue({ idLevel: 1 }) },
		company: { findMany: vi.fn().mockResolvedValue([]) },
		product: { findMany: vi.fn().mockResolvedValue([]) },
		clientOrigin: { findMany: vi.fn().mockResolvedValue([]) },
		level: { findMany: mockLevelFindMany },
	},
}))

import CalculadoraPage from '../page'
import { CalculadoraClient } from '@/features/calculadora/components/calculadora-client'

/** Depth-first search for the CalculadoraClient element in the rendered tree. */
function findClient(
	node: ReactNode
): ReactElement<{ levels: { code: string }[] }> | null {
	if (!isValidElement(node)) return null
	if (node.type === CalculadoraClient) {
		return node as ReactElement<{ levels: { code: string }[] }>
	}
	const children = (node.props as { children?: ReactNode }).children
	for (const child of Array.isArray(children) ? children : [children]) {
		const found = findClient(child as ReactNode)
		if (found) return found
	}
	return null
}

const LEVELS = [
	{ idLevel: 1, name: 'Nivel 0', idNextLevel: 2, code: 'LEVEL_0' },
	{ idLevel: 2, name: 'Nivel 1', idNextLevel: null, code: 'LEVEL_1' },
	{ idLevel: 9, name: 'Partner', idNextLevel: null, code: 'PARTNER_EXTERNAL' },
]

describe('CalculadoraPage level source (PA-03, LVL-01)', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockLevelFindMany.mockResolvedValue(LEVELS)
	})

	it.each(['ADMIN', 'AGENTE'])(
		'never offers PARTNER_EXTERNAL to %s',
		async (role) => {
			mockAuth.mockResolvedValue({ user: { id: '5', role } })

			const client = findClient(await CalculadoraPage())

			expect(client).not.toBeNull()
			const codes = client!.props.levels.map((l) => l.code)
			expect(codes).not.toContain('PARTNER_EXTERNAL')
			expect(codes).toContain('LEVEL_0')
		}
	)
})
