import { describe, it, expect, vi, beforeEach } from 'vitest'
import CrearNegocioPage from '@/app/dashboard/negocios/crear/page'
import { getAccessibleUserIds } from '@/features/auth/lib/hierarchy'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { getLeadForConversion } from '@/features/leads/services/lead-conversion.service'
import { UserRole } from '@/features/auth/lib/roles'

vi.mock('next/cache', () => ({
	unstable_cache: (fn: (...args: never[]) => unknown) => fn,
}))

vi.mock('next/navigation', () => ({
	redirect: vi.fn(),
}))

vi.mock('@/features/company/services/company.service', () => ({
	getCompanies: vi.fn().mockResolvedValue([]),
}))
vi.mock('@/features/product/services/product.service', () => ({
	getProducts: vi.fn().mockResolvedValue([]),
}))
vi.mock('@/features/admin/periodicities/services/periodicity.service', () => ({
	getPeriodicities: vi.fn().mockResolvedValue([]),
}))
vi.mock('@/features/admin/currencies/services/currency.service', () => ({
	getCurrencies: vi.fn().mockResolvedValue([]),
}))
vi.mock('@/features/origins/services/origins.service', () => ({
	getClientOrigins: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/auth', () => ({
	auth: vi.fn().mockResolvedValue({ user: { email: 'user@financieramentecu.com' } }),
}))

vi.mock('@/features/negocios/services/user.service', () => ({
	getCurrentUserByEmail: vi.fn(),
}))

vi.mock('@/features/leads/services/lead-conversion.service', () => ({
	getLeadForConversion: vi.fn().mockResolvedValue(null),
	linkLeadToBusinessTx: vi.fn(),
}))

vi.mock('@/features/leads/mappers/lead-to-business-defaults', () => ({
	mapLeadToBusinessDefaults: vi.fn(),
}))
vi.mock('@/features/leads/mappers/lead-owner-to-agent-info', () => ({
	mapLeadOwnerToAgentInfo: vi.fn(),
}))

vi.mock('@/features/shared/layout/DashboardLayout', () => ({
	DashboardLayout: (props: { children?: unknown }) => props.children ?? null,
}))
vi.mock('@/features/negocios/components/business-wrapper', () => ({
	default: () => null,
}))

vi.mock('@/features/auth/lib/hierarchy', async (importOriginal) => {
	const actual =
		await importOriginal<typeof import('@/features/auth/lib/hierarchy')>()
	return {
		...actual,
		getAccessibleUserIds: vi.fn().mockResolvedValue([1]),
	}
})

function currentUserWithRole(role: UserRole) {
	return {
		idUser: 1,
		role: { code: role },
	}
}

describe('CrearNegocioPage — CONSULTOR write-screen visibility (latent bug fix)', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(getLeadForConversion).mockResolvedValue(null)
	})

	it('does NOT bypass hierarchy visibility for CONSULTOR when resolving a lead prefill', async () => {
		vi.mocked(getCurrentUserByEmail).mockResolvedValue(
			currentUserWithRole(UserRole.CONSULTOR) as never
		)

		await CrearNegocioPage({
			searchParams: Promise.resolve({ leadId: '5' }),
		})

		expect(getAccessibleUserIds).toHaveBeenCalledWith(1)
	})

	it('still bypasses hierarchy visibility for ADMIN (unchanged behavior)', async () => {
		vi.mocked(getCurrentUserByEmail).mockResolvedValue(
			currentUserWithRole(UserRole.ADMIN) as never
		)

		await CrearNegocioPage({
			searchParams: Promise.resolve({ leadId: '5' }),
		})

		expect(getAccessibleUserIds).not.toHaveBeenCalled()
	})
})
