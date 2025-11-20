import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { DashboardLayout } from "@/layouts/DashboardLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { UserRole } from "@/lib/auth/roles"

/**
 * Página de Reportes
 * 
 * Muestra reportes según el rol del usuario:
 * - Agente: Solo reportes personales
 * - Analista: Reportes de negocio
 * - Asistente Gerencia: Todos los reportes
 */
export default async function ReportesPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  // Verificar permisos
  const canViewReportes = 
    session.user.permissions?.reportes?.all || 
    session.user.permissions?.reportes?.business || 
    session.user.permissions?.reportes?.personal

  if (!canViewReportes) {
    redirect("/dashboard")
  }

  // Redirigir agentes a reportes personales
  if (session.user.role === UserRole.AGENTE) {
    redirect("/dashboard/reportes/personales")
  }

  return (
    <DashboardLayout currentPage="Reportes">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Reportes</h1>
          <p className="text-muted-foreground">
            Visualiza reportes y estadísticas del sistema
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {session.user.permissions?.reportes?.all && (
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle>Todos los Reportes</CardTitle>
                <CardDescription>
                  Acceso completo a todos los reportes del sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">
                  Acceso completo a todos los reportes disponibles en el sistema.
                </p>
                <div className="flex gap-2">
                  <a href="/dashboard/reportes/negocio" className="text-primary hover:underline text-sm font-medium">
                    Reportes de Negocio →
                  </a>
                </div>
              </CardContent>
            </Card>
          )}

          {session.user.permissions?.reportes?.business && (
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle>Reportes de Negocio</CardTitle>
                <CardDescription>
                  Reportes relacionados con negocios y operaciones
                </CardDescription>
              </CardHeader>
              <CardContent>
                <a href="/dashboard/reportes/negocio" className="text-primary hover:underline font-medium">
                  Ver Reportes de Negocio →
                </a>
              </CardContent>
            </Card>
          )}

          {session.user.permissions?.reportes?.personal && (
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle>Mis Reportes</CardTitle>
                <CardDescription>
                  Reportes personales de comisiones y producción
                </CardDescription>
              </CardHeader>
              <CardContent>
                <a href="/dashboard/reportes/personales" className="text-primary hover:underline font-medium">
                  Ver Mis Reportes →
                </a>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

