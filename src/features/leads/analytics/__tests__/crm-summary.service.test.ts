import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UserRole } from '@/features/auth/lib/roles'
import { getCrmSummary } from '../crm-summary.service'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    lead: { count: vi.fn(), groupBy: vi.fn() },
    leadTask: { count: vi.fn() },
    leadSupportCase: { count: vi.fn() },
  },
}))

import { prisma } from '@/lib/prisma'

describe('getCrmSummary', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns only aggregate metrics for the scoped opportunity CRM', async () => {
    vi.mocked(prisma.lead.count).mockResolvedValue(12 as never)
    vi.mocked(prisma.lead.groupBy).mockResolvedValue([
      { idLeadFunnelColumn: 2, _count: { idLead: 7 } },
      { idLeadFunnelColumn: 3, _count: { idLead: 5 } },
    ] as never)
    vi.mocked(prisma.leadTask.count).mockResolvedValueOnce(4 as never).mockResolvedValueOnce(2 as never)
    vi.mocked(prisma.leadSupportCase.count).mockResolvedValueOnce(3 as never).mockResolvedValueOnce(1 as never)

    const result = await getCrmSummary({
      viewer: { idUser: 7, role: { code: UserRole.AGENTE } },
      visibleUserIds: [7, 8],
      isBypass: false,
    })

    expect(result).toEqual({
      opportunities: 12,
      stageCounts: [
        { idLeadFunnelColumn: 2, count: 7 },
        { idLeadFunnelColumn: 3, count: 5 },
      ],
      openTasks: 4,
      overdueTasks: 2,
      openCases: 3,
      overdueCases: 1,
    })
    expect(prisma.lead.count).toHaveBeenCalledWith(expect.objectContaining({ where: expect.any(Object) }))
    expect(prisma.leadTask.count).toHaveBeenCalledTimes(2)
    expect(prisma.leadSupportCase.count).toHaveBeenCalledTimes(2)
  })

  it('returns zero aggregates without querying for an empty non-bypass scope', async () => {
    const result = await getCrmSummary({
      viewer: { idUser: 7, role: { code: UserRole.AGENTE } },
      visibleUserIds: [],
      isBypass: false,
    })

    expect(result).toEqual({ opportunities: 0, stageCounts: [], openTasks: 0, overdueTasks: 0, openCases: 0, overdueCases: 0 })
    expect(prisma.lead.count).not.toHaveBeenCalled()
  })
})
