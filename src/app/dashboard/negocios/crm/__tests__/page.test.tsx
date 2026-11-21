import { describe, it, expect, vi, beforeEach } from 'vitest'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { isFeatureEnabledServer } from '@/features/shared/lib/flagsmith-server'
import { UserRole } from '@/features/auth/lib/roles'
import CrmPage from '@/app/dashboard/negocios/crm/page'

class RedirectError extends Error {
	constructor(public readonly url: string) {
		super(`redirect:${url}`)
	}
}

vi.mock('next/navigation', () => ({
	redirect: vi.fn((url: string) => {
		throw new RedirectError(url)
	}),
}))
vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/features/shared/lib/flagsmith-server', () => ({
	isFeatureEnabledServer: vi.fn(),
}))
vi.mock('@/features/shared/layout/DashboardLayout', () => ({
	DashboardLayout: ({ children }: { children: React.ReactNode }) => children,
}))
vi.mock('@/features/leads/components/crm-tabs', () => ({
	CrmTabs: () => null,
}))

function mockSession(role: UserRole, canViewOthersCrm = false) {
	vi.mocked(auth).mockResolvedValue({
		user: { email: 'user@financieramentecu.com', role, canViewOthersCrm },
	} as never)
}

describe('CrmPage guards', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(isFeatureEnabledServer).mockResolvedValue(true)
	})

	it('redirects PARTNER (no leads access) to /dashboard/negocios', async () => {
		mockSession(UserRole.PARTNER)
		await expect(CrmPage()).rejects.toThrow('redirect:/dashboard/negocios')
	})

	it('redirects CONSULTOR until an admin grants the CRM view', async () => {
		mockSession(UserRole.CONSULTOR)
		await expect(CrmPage()).rejects.toThrow('redirect:/dashboard/negocios')
	})

	it('renders for CONSULTOR when the read-only grant is on', async () => {
		mockSession(UserRole.CONSULTOR, true)
		await expect(CrmPage()).resolves.toBeTruthy()
		expect(redirect).not.toHaveBeenCalled()
	})

	it('redirects to /dashboard when leads_module is disabled', async () => {
		mockSession(UserRole.ADMIN)
		vi.mocked(isFeatureEnabledServer).mockResolvedValue(false)
		await expect(CrmPage()).rejects.toThrow(/^redirect:\/dashboard$/)
	})

	it('renders for roles with leads access', async () => {
		mockSession(UserRole.AGENTE)
		await expect(CrmPage()).resolves.toBeTruthy()
		expect(redirect).not.toHaveBeenCalled()
	})
})
