import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { DashboardLayout } from "@/layouts/DashboardLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

/**
 * Página de Cargas
 * 
 * Muestra opciones de carga masiva e historial
 */
export default async function CargasPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  // Verificar permisos
  const canViewCargas = 
    session.user.permissions?.cargas?.cargaMasiva || 
    session.user.permissions?.cargas?.historial

  if (!canViewCargas) {
    redirect("/dashboard")
  }

  return (
    <DashboardLayout currentPage="Cargas">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Cargas</h1>
          <p className="text-muted-foreground">
            Gestiona las cargas masivas y revisa el historial de cargas
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {session.user.permissions?.cargas?.cargaMasiva && (
            <Card>
              <CardHeader>
                <CardTitle>Carga Masiva</CardTitle>
                <CardDescription>
                  Importa múltiples negocios desde un archivo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Próximamente podrás cargar archivos Excel o CSV con múltiples negocios.
                </p>
              </CardContent>
            </Card>
          )}

          {session.user.permissions?.cargas?.historial && (
            <Card>
              <CardHeader>
                <CardTitle>Historial de Cargas</CardTitle>
                <CardDescription>
                  Revisa el historial de todas las cargas realizadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Próximamente podrás ver el historial completo de cargas masivas.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

