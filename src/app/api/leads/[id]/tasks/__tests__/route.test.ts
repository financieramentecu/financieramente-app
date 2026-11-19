import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET, POST } from '../route'
import { auth } from '@/auth'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { getLeadDetail, isLeadVisible } from '@/features/leads/services/lead-board.service'
import { canAccessCrm, canManageCrm } from '@/features/leads/crm/crm-policy'
import { isFeatureEnabledServer } from '@/features/shared/lib/flagsmith-server'
import { createLeadTaskTx } from '@/features/leads/tasks/lead-task.service'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/features/negocios/services/user.service', () => ({ getCurrentUserByEmail: vi.fn() }))
vi.mock('@/features/auth/lib/hierarchy', () => ({ getAccessibleUserIds: vi.fn(() => Promise.resolve([])), isHierarchyBypassRole: vi.fn(() => true) }))
vi.mock('@/features/leads/services/lead-board.service', () => ({ getLeadDetail: vi.fn(), isLeadVisible: vi.fn() }))
vi.mock('@/features/leads/crm/crm-policy', () => ({ canAccessCrm: vi.fn(), canManageCrm: vi.fn() }))
vi.mock('@/features/shared/lib/flagsmith-server', () => ({ isFeatureEnabledServer: vi.fn() }))
vi.mock('@/features/leads/tasks/lead-task.service', () => ({ createLeadTaskTx: vi.fn() }))
vi.mock('@/lib/prisma', () => ({
	prisma: {
		leadTask: { findMany: vi.fn() },
		leadActivityLabel: { findFirst: vi.fn() },
		$transaction: vi.fn((callback) => callback({})),
	},
}))
vi.mock('next/server', () => ({ NextResponse: { json: vi.fn((data, init) => ({ status: init?.status ?? 200, json: () => Promise.resolve(data) })) } }))

const context = (id: string) => ({ params: Promise.resolve({ id }) })
const request = (body?: unknown) => new Request('http://x', { method: body ? 'POST' : 'GET', headers: body ? { 'content-type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined })

describe('/api/leads/[id]/tasks', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(auth).mockResolvedValue({ user: { email: 'agent@example.com' } } as never)
		vi.mocked(getCurrentUserByEmail).mockResolvedValue({ idUser: 7, role: { code: 'AGENTE' } } as never)
		vi.mocked(isFeatureEnabledServer).mockResolvedValue(true)
		vi.mocked(canAccessCrm).mockReturnValue(true)
		vi.mocked(canManageCrm).mockReturnValue(true)
		vi.mocked(getLeadDetail).mockResolvedValue({ idLead: 1 } as never)
		vi.mocked(isLeadVisible).mockResolvedValue(true)
	})

	it('returns 404 while crm_tasks is disabled', async () => {
		vi.mocked(isFeatureEnabledServer).mockResolvedValue(false)
		expect((await GET(request(), context('1'))).status).toBe(404)
	})

	it('creates a scoped follow-up task through the transaction service', async () => {
		vi.mocked(createLeadTaskTx).mockResolvedValue({ idLeadTask: 3 } as never)
		const response = await POST(request({ title: 'Llamar mañana', assignedTo: 7 }), context('1'))
		expect(response.status).toBe(201)
		expect(createLeadTaskTx).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ idLead: 1, createdBy: 7, assignedTo: 7 }))
	})
})
