import { describe, it, expect, vi } from 'vitest'
import { Suspense } from 'react'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

import DashboardRootLayout from '../layout'
import { DashboardSessionGate } from '@/features/auth/components/dashboard-session-gate'
import { DashboardLoadingSkeleton } from '@/features/shared/layout/DashboardLoadingSkeleton'

describe('dashboard layout', () => {
	it('does not block on auth(): it streams a skeleton while the session gate runs', () => {
		const result = DashboardRootLayout({ children: <p>child</p> })

		expect(result.type).toBe(Suspense)
		expect(result.props.fallback.type).toBe(DashboardLoadingSkeleton)
		expect(result.props.children.type).toBe(DashboardSessionGate)
	})
})
