import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock prisma before importing the service
vi.mock('@/lib/prisma', () => ({
  prisma: {
    business: {
      findMany: vi.fn(),
    },
    level: {
      findMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
  },
}))

// Mock bogota-date-range to avoid timezone complexities in tests
vi.mock('@/features/negocios/lib/bogota-date-range', () => ({
  parseBogotaInclusiveUtcRange: vi.fn((start: string, end: string) => ({
    gte: new Date(`${start}T00:00:00.000Z`),
    lte: new Date(`${end}T23:59:59.999Z`),
  })),
}))

import { prisma } from '@/lib/prisma'
import {
  buildLevelOrderMap,
  getHeatmapRaw,
  resolveViewerScope,
} from '../../services/heatmap.service'
import type { HeatmapQueryParams } from '../../types/production-kpi.types'
import type { DashboardAppliedFilters } from '../../types/dashboard-filter.types'

const mockFindMany = vi.mocked(prisma.business.findMany)
const mockLevelFindMany = vi.mocked(prisma.level.findMany)
const mockUserFindMany = vi.mocked(prisma.user.findMany)

const defaultFilters: DashboardAppliedFilters = {
  dateRange: { start: new Date('2026-01-01'), end: new Date('2026-01-31') },
  statuses: [],
  categoryIds: [],
  companyIds: [],
  productIds: [],
  originIds: [],
  plazos: [],
  periodicidades: [],
  isInternacional: false,
}

function makeParams(userIds: number[], filters = defaultFilters): HeatmapQueryParams {
  return { userIds, appliedFilters: filters }
}

// ─── Level fixture data ───────────────────────────────────────────────────────
// Chain: MIA(1) → TL(2) → MS_SENIOR(3) → MS_JUNIOR(4) → null
const LEVEL_ROWS = [
  { idLevel: 1, code: 'GENERAL_LEVEL', name: 'MIA', color: '#111', idNextLevel: 2 },
  { idLevel: 2, code: 'TEAM_LEADER', name: 'Team Leader', color: '#222', idNextLevel: 3 },
  { idLevel: 3, code: 'MS_SENIOR', name: 'MS Senior', color: '#333', idNextLevel: 4 },
  { idLevel: 4, code: 'MS_JUNIOR', name: 'MS Junior', color: '#444', idNextLevel: null },
]

// ─── Business fixture data ────────────────────────────────────────────────────
function makeBusinessRow(overrides: {
  idBusiness?: number
  idUser?: number
  value?: string | number
  userName?: string
  userLastName?: string
  levelCode?: string
  levelColor?: string
  levelId?: number
  idNextLevel?: number | null
  categoryName?: string
  idCategory?: number | null
  idCompany?: number
  companyName?: string
}) {
  return {
    idBusiness: overrides.idBusiness ?? 1,
    idUser: overrides.idUser ?? 1,
    value: { toNumber: () => Number(overrides.value ?? 100000) },
    user: {
      idUser: overrides.idUser ?? 1,
      name: overrides.userName ?? 'Ana',
      lastName: overrides.userLastName ?? 'García',
      idLevel: overrides.levelId ?? 3,
      idCategory: overrides.idCategory ?? 10,
      category: overrides.categoryName ? { name: overrides.categoryName } : null,
      level: {
        idLevel: overrides.levelId ?? 3,
        code: overrides.levelCode ?? 'MS_SENIOR',
        color: overrides.levelColor ?? '#333',
        idNextLevel: overrides.idNextLevel !== undefined ? overrides.idNextLevel : 4,
      },
    },
    productPercentageCommission: {
      productConfiguration: {
        product: {
          idCompany: overrides.idCompany ?? 5,
          company: { idCompany: overrides.idCompany ?? 5, name: overrides.companyName ?? 'Empresa X' },
        },
      },
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── buildLevelOrderMap tests ─────────────────────────────────────────────────

describe('buildLevelOrderMap', () => {
  it('(a) assigns numeric rank via idNextLevel chain — root gets highest rank', () => {
    // Chain: 1 → 2 → 3 → 4 (null)
    // Root (1, no idNextLevel incoming) gets rank = length of chain = 4
    // Next level (2) gets 3, etc. Tail (4) gets 1.
    const map = buildLevelOrderMap(LEVEL_ROWS)

    // Root of chain (MIA=1) should have highest rank
    expect(map.get(1)).toBeGreaterThan(map.get(2)!)
    expect(map.get(2)).toBeGreaterThan(map.get(3)!)
    expect(map.get(3)).toBeGreaterThan(map.get(4)!)
  })

  it('(b) tail node (idNextLevel null) gets rank 1', () => {
    const map = buildLevelOrderMap(LEVEL_ROWS)
    expect(map.get(4)).toBe(1) // MS_JUNIOR is tail
  })

  it('(c) orphan level node (not connected to chain) gets levelOrder 0', () => {
    const levelsWithOrphan = [
      ...LEVEL_ROWS,
      { idLevel: 99, code: 'ORPHAN', name: 'Orphan', color: '#999', idNextLevel: null },
    ]
    // Also no level has idNextLevel pointing to 99, so it's an orphan
    const map = buildLevelOrderMap(levelsWithOrphan)
    expect(map.get(99)).toBe(0)
  })

  it('(d) returns empty Map for empty input', () => {
    const map = buildLevelOrderMap([])
    expect(map.size).toBe(0)
  })
})

// ─── getHeatmapRaw tests ──────────────────────────────────────────────────────

describe('getHeatmapRaw', () => {
  it('(a) returns [] immediately when userIds is empty — no Prisma call', async () => {
    const result = await getHeatmapRaw(makeParams([]))
    expect(result).toEqual([])
    expect(mockFindMany).not.toHaveBeenCalled()
    expect(mockLevelFindMany).not.toHaveBeenCalled()
  })

  it('(b) aggregates rows by (idUser, idCompany) — sums copTotal', async () => {
    // Two business rows for same user + same company → should produce one cell
    mockLevelFindMany.mockResolvedValue(LEVEL_ROWS as never)
    mockFindMany.mockResolvedValue([
      makeBusinessRow({ idBusiness: 1, idUser: 1, value: 200000, idCompany: 5 }),
      makeBusinessRow({ idBusiness: 2, idUser: 1, value: 300000, idCompany: 5 }),
    ] as never)

    const result = await getHeatmapRaw(makeParams([1]))

    expect(result).toHaveLength(1)
    expect(result[0].idUser).toBe(1)
    expect(result[0].cells).toHaveLength(1)
    expect(result[0].cells[0].idCompany).toBe(5)
    expect(result[0].cells[0].copTotal).toBe(500000)
    expect(result[0].cells[0].count).toBe(2)
  })

  it('(c) multiple users produce separate HeatmapRaw entries', async () => {
    mockLevelFindMany.mockResolvedValue(LEVEL_ROWS as never)
    mockFindMany.mockResolvedValue([
      makeBusinessRow({ idBusiness: 1, idUser: 1, value: 100000, idCompany: 5, userName: 'Ana', userLastName: 'García' }),
      makeBusinessRow({ idBusiness: 2, idUser: 2, value: 200000, idCompany: 6, userName: 'Carlos', userLastName: 'López' }),
    ] as never)

    const result = await getHeatmapRaw(makeParams([1, 2]))

    expect(result).toHaveLength(2)
    const user1 = result.find((r) => r.idUser === 1)
    const user2 = result.find((r) => r.idUser === 2)
    expect(user1?.cells[0].copTotal).toBe(100000)
    expect(user2?.cells[0].copTotal).toBe(200000)
  })

  it('(d) same user, two different companies — produces two cells', async () => {
    mockLevelFindMany.mockResolvedValue(LEVEL_ROWS as never)
    mockFindMany.mockResolvedValue([
      makeBusinessRow({ idBusiness: 1, idUser: 1, value: 100000, idCompany: 5, companyName: 'Empresa X' }),
      makeBusinessRow({ idBusiness: 2, idUser: 1, value: 200000, idCompany: 6, companyName: 'Empresa Y' }),
    ] as never)

    const result = await getHeatmapRaw(makeParams([1]))

    expect(result).toHaveLength(1)
    expect(result[0].cells).toHaveLength(2)
  })

  it('(e) isInternacional from appliedFilters is never forwarded — where clause does not include it', async () => {
    mockLevelFindMany.mockResolvedValue(LEVEL_ROWS as never)
    mockFindMany.mockResolvedValue([
      makeBusinessRow({ idBusiness: 1, idUser: 1, value: 100000, idCompany: 5 }),
    ] as never)

    const filtersWithInternacional: DashboardAppliedFilters = {
      ...defaultFilters,
      isInternacional: true,
    }
    await getHeatmapRaw(makeParams([1], filtersWithInternacional))

    const callArgs = mockFindMany.mock.calls[0]?.[0] as { where?: Record<string, unknown> } | undefined
    // isInternacional should not appear in the where clause
    expect(JSON.stringify(callArgs?.where ?? {})).not.toContain('isInternacional')
  })

  it('(f) levelOrder assigned from chain — MS_SENIOR row gets correct numeric rank', async () => {
    mockLevelFindMany.mockResolvedValue(LEVEL_ROWS as never)
    mockFindMany.mockResolvedValue([
      makeBusinessRow({
        idBusiness: 1, idUser: 1, value: 100000, idCompany: 5,
        levelId: 3, levelCode: 'MS_SENIOR', levelColor: '#333', idNextLevel: 4,
      }),
    ] as never)

    const result = await getHeatmapRaw(makeParams([1]))

    // MS_SENIOR (idLevel=3) has one level below it (MS_JUNIOR), so its rank should be 2
    expect(result[0].levelOrder).toBe(2)
  })
})

// ─── resolveViewerScope tests ─────────────────────────────────────────────────

describe('resolveViewerScope', () => {
  it('(a) bypass role returns all active users', async () => {
    mockUserFindMany.mockResolvedValue([
      { idUser: 1 }, { idUser: 2 }, { idUser: 3 },
    ] as never)

    const result = await resolveViewerScope(1, 'ADMIN')
    expect(result).toEqual([1, 2, 3])
  })

  it('(b) non-bypass role with GENERAL_LEVEL code still gets subtree only — no full-scope bypass', async () => {
    // GENERAL_LEVEL is a commission-calculation concept, never a visibility bypass.
    // Only HIERARCHY_BYPASS_ROLES may see all active users.
    mockUserFindMany.mockResolvedValue([
      { idUser: 1, idUserLeader: null }, { idUser: 2, idUserLeader: 1 },
    ] as never)

    const result = await resolveViewerScope(1, 'DEFAULT', 'GENERAL_LEVEL')
    // Subtree call: prisma.user.findMany is invoked with the subtree query shape
    // (select idUser + idUserLeader), not the full-scope shape (select idUser only)
    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({ idUserLeader: true }),
      })
    )
    expect(result).toContain(1)
  })

  it('(b2) non-bypass role with any other level code also gets subtree only', async () => {
    mockUserFindMany.mockResolvedValue([
      { idUser: 5, idUserLeader: null },
    ] as never)

    const result = await resolveViewerScope(5, 'DEFAULT', 'MS_JUNIOR')
    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({ idUserLeader: true }),
      })
    )
    expect(result).toContain(5)
  })

  it('(c) non-bypass role returns subtree via user query', async () => {
    // Simulates recursive lookup: viewer 2 can see themselves + subordinates
    mockUserFindMany.mockResolvedValue([
      { idUser: 2 }, { idUser: 3 }, { idUser: 4 },
    ] as never)

    const result = await resolveViewerScope(2, 'DEFAULT', 'TEAM_LEADER')
    expect(result).toContain(2)
  })

  it('(d) returns at least viewerId for any role', async () => {
    mockUserFindMany.mockResolvedValue([{ idUser: 5 }] as never)

    const result = await resolveViewerScope(5, 'DEFAULT', 'MS_JUNIOR')
    expect(result).toContain(5)
  })

  it('(e) CONSULTOR (read-only global visibility) returns all active users', async () => {
    mockUserFindMany.mockResolvedValue([
      { idUser: 1 }, { idUser: 2 }, { idUser: 3 },
    ] as never)

    const result = await resolveViewerScope(9, 'CONSULTOR')
    expect(result).toEqual([1, 2, 3])
  })
})
