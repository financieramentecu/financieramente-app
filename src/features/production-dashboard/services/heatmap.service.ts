/**
 * Service: Heatmap production aggregation.
 * Provides getHeatmapRaw, buildLevelOrderMap, and resolveViewerScope.
 * Reuses buildProductionWhereClause from ms-chart.service to prevent filter drift.
 */

import { prisma } from '@/lib/prisma'
import { HIERARCHY_BYPASS_ROLES } from '@/features/auth/lib/hierarchy'
import { buildProductionWhereClause } from './ms-chart.service'
import type { HeatmapRaw, HeatmapQueryParams } from '../types/production-kpi.types'

// ─── Level ordering ────────────────────────────────────────────────────────────

type LevelInput = {
  idLevel: number
  idNextLevel: number | null
}

/**
 * Walks the Level.idNextLevel chain to assign integer rank order.
 * Root of the chain (highest seniority) gets the highest rank = chain length.
 * Tail (idNextLevel = null) gets rank 1.
 * Orphan nodes (not part of any chain) get rank 0.
 *
 * Pure function — exported for unit testing.
 */
export function buildLevelOrderMap(levels: LevelInput[]): Map<number, number> {
  if (levels.length === 0) return new Map()

  // Build a set of all idNextLevel values to find chain roots
  // (nodes that are NOT pointed to by any other node are roots)
  const pointedTo = new Set<number>()
  for (const level of levels) {
    if (level.idNextLevel !== null) {
      pointedTo.add(level.idNextLevel)
    }
  }

  // Build a fast lookup map
  const byId = new Map<number, LevelInput>()
  for (const level of levels) {
    byId.set(level.idLevel, level)
  }

  // Walk each chain starting from root nodes
  const orderMap = new Map<number, number>()
  const assigned = new Set<number>()

  for (const level of levels) {
    // Skip nodes that are not roots (they will be assigned when their chain root is walked)
    if (pointedTo.has(level.idLevel)) continue

    // Walk forward from this root, collecting the chain
    const chain: number[] = []
    let current: LevelInput | undefined = level
    const visited = new Set<number>()

    while (current !== undefined && !visited.has(current.idLevel)) {
      visited.add(current.idLevel)
      chain.push(current.idLevel)
      current = current.idNextLevel !== null ? byId.get(current.idNextLevel) : undefined
    }

    // A standalone single-node chain (idNextLevel=null, no one points to it) is an orphan → rank 0
    if (chain.length === 1) {
      orderMap.set(chain[0], 0)
      assigned.add(chain[0])
      continue
    }

    // Assign ranks: root = chain.length, tail = 1
    const chainLength = chain.length
    for (let i = 0; i < chain.length; i++) {
      const rank = chainLength - i
      orderMap.set(chain[i], rank)
      assigned.add(chain[i])
    }
  }

  // Any unassigned levels are orphans → rank 0
  for (const level of levels) {
    if (!assigned.has(level.idLevel)) {
      orderMap.set(level.idLevel, 0)
    }
  }

  return orderMap
}

// ─── Role-based scope resolution ──────────────────────────────────────────────

/**
 * Resolves the set of userIds the viewer is allowed to see.
 * Bypass roles and GENERAL_LEVEL → all active users.
 * All other roles → viewer's own subtree (viewer + active subordinates).
 */
export async function resolveViewerScope(
  viewerId: number,
  roleCode: string | null | undefined,
  levelCode?: string | null
): Promise<number[]> {
  const isFullScope =
    levelCode === 'GENERAL_LEVEL' ||
    (roleCode !== null &&
      roleCode !== undefined &&
      (HIERARCHY_BYPASS_ROLES as ReadonlyArray<string>).includes(roleCode))

  if (isFullScope) {
    // Return all active users
    const users = await prisma.user.findMany({
      where: { active: true },
      select: { idUser: true },
    })
    return users.map((u) => u.idUser)
  }

  // Return viewer + active subordinates reachable via idUserLeader (BFS)
  const allUsers = await prisma.user.findMany({
    where: { active: true },
    select: { idUser: true, idUserLeader: true },
  })

  // Build children map
  const childrenMap = new Map<number, number[]>()
  for (const user of allUsers) {
    if (user.idUserLeader === null) continue
    const existing = childrenMap.get(user.idUserLeader) ?? []
    existing.push(user.idUser)
    childrenMap.set(user.idUserLeader, existing)
  }

  // BFS from viewerId
  const result = new Set<number>([viewerId])
  const queue = [viewerId]

  while (queue.length > 0) {
    const current = queue.shift()!
    const children = childrenMap.get(current) ?? []
    for (const childId of children) {
      if (!result.has(childId)) {
        result.add(childId)
        queue.push(childId)
      }
    }
  }

  return Array.from(result)
}

// ─── Heatmap aggregation ───────────────────────────────────────────────────────

const COP_CURRENCY_ID = 1

type BusinessWithCompany = {
  idBusiness: number
  idUser: number
  idCurrency: number | null
  value: { toNumber: () => number }
  user: {
    idUser: number
    name: string
    lastName: string | null
    idLevel: number | null
    idCategory: number | null
    category: { name: string } | null
    level: {
      idLevel: number
      code: string
      color: string
      idNextLevel: number | null
    } | null
  }
  productPercentageCommission: {
    productConfiguration: {
      product: {
        idCompany: number
        company: { idCompany: number; name: string }
      }
    }
  }
}

/**
 * Returns per-user, per-company production aggregation for the given scope.
 * Short-circuits on empty userIds — no DB query issued.
 * Service returns raw COP totals; TRM conversion is performed in the hook.
 */
export async function getHeatmapRaw(params: HeatmapQueryParams): Promise<HeatmapRaw[]> {
  if (params.userIds.length === 0) return []

  // Fetch levels for rank computation and business rows in parallel
  const [levels, businesses] = await Promise.all([
    prisma.level.findMany({
      where: { status: true },
      select: { idLevel: true, code: true, color: true, idNextLevel: true },
    }),
    prisma.business.findMany({
      where: buildProductionWhereClause(params),
      select: {
        idBusiness: true,
        idUser: true,
        idCurrency: true,
        value: true,
        user: {
          select: {
            idUser: true,
            name: true,
            lastName: true,
            idLevel: true,
            idCategory: true,
            category: { select: { name: true } },
            level: {
              select: {
                idLevel: true,
                code: true,
                color: true,
                idNextLevel: true,
              },
            },
          },
        },
        productPercentageCommission: {
          select: {
            productConfiguration: {
              select: {
                product: {
                  select: {
                    idCompany: true,
                    company: { select: { idCompany: true, name: true } },
                  },
                },
              },
            },
          },
        },
      },
    }) as unknown as Promise<BusinessWithCompany[]>,
  ])

  const levelOrderMap = buildLevelOrderMap(levels)

  return buildHeatmapCells(businesses, levelOrderMap)
}

/**
 * Reduces business rows into HeatmapRaw[] grouped by (idUser, idCompany).
 * Extracted as a pure function for readability and testability.
 */
function buildHeatmapCells(
  businesses: BusinessWithCompany[],
  levelOrderMap: Map<number, number>
): HeatmapRaw[] {
  // Accumulator: keyed by idUser
  const userMap = new Map<
    number,
    {
      idUser: number
      fullName: string
      levelCode: string
      levelOrder: number
      levelColor: string
      categoryName: string
      idCategory: number | null
      companyCells: Map<number, { idCompany: number; companyName: string; copTotal: number; foreignUsdTotal: number; count: number }>
    }
  >()

  for (const business of businesses) {
    const { user } = business
    if (!user) continue

    const idUser = user.idUser
    const fullName = user.lastName ? `${user.name} ${user.lastName}` : user.name
    const levelCode = user.level?.code ?? ''
    const levelColor = user.level?.color ?? '#003c45'
    const levelOrder =
      user.level !== null && user.level !== undefined
        ? (levelOrderMap.get(user.level.idLevel) ?? 0)
        : 0
    const categoryName = user.category?.name ?? ''
    const idCategory = user.idCategory

    const idCompany =
      business.productPercentageCommission.productConfiguration.product.idCompany
    const companyName =
      business.productPercentageCommission.productConfiguration.product.company.name
    const amount = business.value.toNumber()
    const isLocal = (business.idCurrency ?? COP_CURRENCY_ID) === COP_CURRENCY_ID

    if (!userMap.has(idUser)) {
      userMap.set(idUser, {
        idUser,
        fullName,
        levelCode,
        levelOrder,
        levelColor,
        categoryName,
        idCategory,
        companyCells: new Map(),
      })
    }

    const userEntry = userMap.get(idUser)!
    const existing = userEntry.companyCells.get(idCompany)
    if (existing) {
      if (isLocal) {
        existing.copTotal += amount
      } else {
        existing.foreignUsdTotal += amount
      }
      existing.count += 1
    } else {
      userEntry.companyCells.set(idCompany, {
        idCompany,
        companyName,
        copTotal: isLocal ? amount : 0,
        foreignUsdTotal: isLocal ? 0 : amount,
        count: 1,
      })
    }
  }

  return Array.from(userMap.values()).map((entry) => ({
    idUser: entry.idUser,
    fullName: entry.fullName,
    levelCode: entry.levelCode,
    levelOrder: entry.levelOrder,
    levelColor: entry.levelColor,
    categoryName: entry.categoryName,
    idCategory: entry.idCategory,
    cells: Array.from(entry.companyCells.values()).map((c) => ({
      idCompany: c.idCompany,
      companyName: c.companyName,
      copTotal: c.copTotal,
      foreignUsdTotal: c.foreignUsdTotal,
      count: c.count,
    })),
  }))
}
