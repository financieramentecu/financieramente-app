import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth/require-role'
import type { ApiResponse } from '@/features/shared/types/api-response.types'

export interface DashboardCatalogItem {
  id: number
  name: string
}

export interface DashboardProductCatalogItem extends DashboardCatalogItem {
  idCompany: number
}

export interface DashboardCatalogsResponse {
  companies: DashboardCatalogItem[]
  products: DashboardProductCatalogItem[]
  origins: DashboardCatalogItem[]
  categories: DashboardCatalogItem[]
  periodicidades: DashboardCatalogItem[]
}

/**
 * GET /api/production-dashboard/catalogs
 * Returns all active catalog items for dashboard filter dropdowns.
 * No pagination — filter dropdowns need the full set.
 */
export async function GET() {
  const guard = await requireAuth()
  if (!guard.ok) return guard.response

  try {
    const [companies, products, origins, categories, periodicidades] = await Promise.all([
      prisma.company.findMany({
        where: { status: true },
        select: { idCompany: true, name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.product.findMany({
        where: { status: true },
        select: { idProduct: true, name: true, idCompany: true },
        orderBy: { name: 'asc' },
      }),
      prisma.clientOrigin.findMany({
        where: { status: true },
        select: { idClientOrigin: true, name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.category.findMany({
        where: { status: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.buyPeriodicity.findMany({
        where: { active: true },
        select: { idBuyPeriodicity: true, name: true },
        orderBy: { name: 'asc' },
      }),
    ])

    const response: ApiResponse<DashboardCatalogsResponse> = {
      data: {
        companies: companies.map((c) => ({ id: c.idCompany, name: c.name })),
        products: products.map((p) => ({ id: p.idProduct, name: p.name, idCompany: p.idCompany })),
        origins: origins.map((o) => ({ id: o.idClientOrigin, name: o.name })),
        categories: categories.map((c) => ({ id: c.id, name: c.name })),
        periodicidades: periodicidades.map((p) => ({ id: p.idBuyPeriodicity, name: p.name })),
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching dashboard catalogs:', error)
    const errorResponse: ApiResponse<null> = {
      data: null,
      error: 'Error al obtener catálogos del dashboard',
    }
    return NextResponse.json(errorResponse, { status: 500 })
  }
}
