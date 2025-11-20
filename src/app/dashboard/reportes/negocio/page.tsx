import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { DashboardLayout } from "@/layouts/DashboardLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3 } from "lucide-react"

/**
 * Página de Reportes de Negocio
 * 
 * Muestra reportes relacionados con negocios y operaciones
 * Accesible para Analista de Soporte
 */
export default async function ReportesNegocioPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  // Verificar permisos
  if (!session.user.permissions?.reportes?.business) {
    redirect("/dashboard")
  }

  return (
    <DashboardLayout currentPage="Reportes de Negocio">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Reportes de Negocio</h1>
          <p className="text-muted-foreground">
            Visualiza reportes y estadísticas relacionadas con negocios y operaciones
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Reporte de Negocios por Estado
              </CardTitle>
              <CardDescription>
                Análisis de negocios agrupados por estado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Próximamente podrás ver reportes detallados de negocios por estado.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Reporte de Negocios por Período
              </CardTitle>
              <CardDescription>
                Análisis de negocios por período de tiempo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Próximamente podrás ver reportes de negocios filtrados por período.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Reporte de Negocios por Producto
              </CardTitle>
              <CardDescription>
                Análisis de negocios agrupados por producto
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Próximamente podrás ver reportes de negocios por producto.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Reporte de Negocios por Agente
              </CardTitle>
              <CardDescription>
                Análisis de negocios agrupados por agente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Próximamente podrás ver reportes de negocios por agente.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}

