import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@/lib/auth/roles"

/**
 * GET /api/business
 * 
 * Obtiene la lista de negocios.
 * Para agentes, solo muestra sus propios negocios.
 * Para otros roles, muestra todos los negocios según permisos.
 */
export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      )
    }

    const userId = session.user.id ? parseInt(session.user.id) : null
    const userRole = session.user.role

    // Obtener query params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const limitParam = searchParams.get("limit")
    const offsetParam = searchParams.get("offset")

    const limit = limitParam ? Math.min(Math.max(Number(limitParam), 1), 100) : 50
    const offset = offsetParam ? Math.max(Number(offsetParam), 0) : 0

    // Construir filtros
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}

    // Si es agente, solo mostrar sus negocios
    if (userRole === UserRole.AGENTE && userId) {
      where.idUser = userId
    }

    // Filtrar por status si se proporciona
    if (status) {
      where.status = status
    }

    // Obtener negocios con relaciones necesarias
    const [businesses, total] = await Promise.all([
      prisma.business.findMany({
        where,
        include: {
          user: {
            select: {
              idUser: true,
              name: true,
              lastName: true,
              email: true,
            },
          },
          client: {
            select: {
              idClient: true,
              name: true,
              lastName: true,
              identityNumber: true,
            },
          },
          productPercentajeCommision: {
            include: {
              product: {
                select: {
                  idProduct: true,
                  name: true,
                },
              },
            },
          },
          currency: {
            select: {
              idCurrency: true,
              name: true,
              symbol: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: limit,
        skip: offset,
      }),
      prisma.business.count({ where }),
    ])

    // Transformar a formato esperado por el frontend
    const formattedBusinesses = businesses.map((business) => {
      // Normalizar status para que coincida con el tipo esperado
      let status: "Emitido" | "Venta Efectuado" = "Emitido"
      if (business.status === "Venta Efectuada" || business.status === "Venta Efectuado") {
        status = "Venta Efectuado"
      } else if (business.status === "Emitido") {
        status = "Emitido"
      }

      return {
        id: business.idBusiness.toString(),
        contract: business.contract || "",
        identification: business.client?.identityNumber || "",
        user: {
          avatar: "",
          name: `${business.user.name} ${business.user.lastName || ""}`.trim(),
        },
        email: business.user.email || "",
        termPeriod: business.term
          ? `${business.term}/${business.idBuyPeriodicity || ""}`
          : "",
        date: business.createdAt.toISOString().split("T")[0],
        value: Number(business.value),
        product: business.productPercentajeCommision?.product?.name || "",
        status,
      }
    })

    return NextResponse.json({
      businesses: formattedBusinesses,
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error("Error fetching businesses:", error)
    return NextResponse.json(
      { error: "Error al obtener negocios" },
      { status: 500 }
    )
  }
}

