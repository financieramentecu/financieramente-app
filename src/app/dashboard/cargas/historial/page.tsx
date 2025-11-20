import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { DashboardLayout } from "@/layouts/DashboardLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { History } from "lucide-react"

/**
 * Página de Historial de Cargas
 * 
 * Muestra el historial de todas las cargas masivas realizadas
 */
export default async function HistorialCargasPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  // Verificar permisos
  if (!session.user.permissions?.cargas?.historial) {
    redirect("/dashboard")
  }

  return (
    <DashboardLayout currentPage="Historial de Cargas">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Historial de Cargas</h1>
          <p className="text-muted-foreground">
            Revisa el historial completo de todas las cargas masivas realizadas
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Registro de Cargas
            </CardTitle>
            <CardDescription>
              Listado de todas las cargas masivas procesadas en el sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Próximamente podrás ver el historial completo de cargas masivas.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Se mostrará información como: fecha, usuario, archivo, registros procesados, estado, etc.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

