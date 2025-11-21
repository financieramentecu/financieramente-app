import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { UserRole } from "@/lib/auth/roles"
import { DashboardLayout } from "@/layouts/DashboardLayout"
import { prisma } from "@/lib/prisma"

/**
 * Dashboard de Agente
 * 
 * Muestra estadísticas personales del agente:
 * - Total negocios del mes
 * - Resumen de negocios "Venta Efectuada"
 * - Resumen de negocios "Emitidos"
 */
export default async function AgenteDashboardPage() {
  const session = await auth()

  // Verificar autenticación
  if (!session?.user) {
    redirect("/login")
  }

  // Verificar que el usuario es un agente
  if (session.user.role !== UserRole.AGENTE) {
    redirect("/dashboard")
  }

  const userId = parseInt(session.user.id || "0")

  if (!userId) {
    redirect("/login")
  }

  // Obtener estadísticas del agente
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  // Total negocios del mes
  const totalNegociosMes = await prisma.business.count({
    where: {
      idUser: userId,
      createdAt: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
  })

  // Negocios "Venta Efectuada"
  const ventasEfectuadas = await prisma.business.count({
    where: {
      idUser: userId,
      status: "Venta Efectuada",
      createdAt: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
  })

  // Negocios "Emitidos"
  const negociosEmitidos = await prisma.business.count({
    where: {
      idUser: userId,
      status: "Emitido",
      createdAt: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
  })

  // Valor total de negocios del mes
  const valorTotalMes = await prisma.business.aggregate({
    where: {
      idUser: userId,
      createdAt: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
    _sum: {
      value: true,
    },
  })

  const stats = {
    totalNegocios: totalNegociosMes,
    ventasEfectuadas,
    negociosEmitidos,
    valorTotal: valorTotalMes._sum.value || 0,
  }

  return (
    <DashboardLayout currentPage="Mi Dashboard">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Mi Dashboard</h1>
          <p className="text-muted-foreground">
            Estadísticas personales de tu actividad
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Negocios del Mes
                </p>
                <p className="text-2xl font-bold">{stats.totalNegocios}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Ventas Efectuadas
                </p>
                <p className="text-2xl font-bold">{stats.ventasEfectuadas}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Negocios Emitidos
                </p>
                <p className="text-2xl font-bold">{stats.negociosEmitidos}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Valor Total del Mes
                </p>
                <p className="text-2xl font-bold">
                  ${stats.valorTotal.toLocaleString("es-CO", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold">Resumen de Ventas Efectuadas</h3>
            <p className="text-sm text-muted-foreground">
              Total de negocios con estado &quot;Venta Efectuada&quot; en el mes actual.
            </p>
            <div className="mt-4">
              <p className="text-3xl font-bold">{stats.ventasEfectuadas}</p>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold">Resumen de Negocios Emitidos</h3>
            <p className="text-sm text-muted-foreground">
              Total de negocios con estado &quot;Emitido&quot; en el mes actual.
            </p>
            <div className="mt-4">
              <p className="text-3xl font-bold">{stats.negociosEmitidos}</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}



