import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { DashboardLayout } from "@/layouts/DashboardLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload } from "lucide-react"

/**
 * Página de Carga Masiva
 * 
 * Permite cargar archivos Excel o CSV con múltiples negocios
 */
export default async function CargaMasivaPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  // Verificar permisos
  if (!session.user.permissions?.cargas?.cargaMasiva) {
    redirect("/dashboard")
  }

  return (
    <DashboardLayout currentPage="Carga Masiva">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Carga Masiva</h1>
          <p className="text-muted-foreground">
            Importa múltiples negocios desde un archivo Excel o CSV
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Subir Archivo</CardTitle>
            <CardDescription>
              Selecciona un archivo Excel (.xlsx) o CSV (.csv) con los negocios a importar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Arrastra y suelta tu archivo aquí, o haz clic para seleccionar
              </p>
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Seleccionar Archivo
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-2">Formato requerido:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Archivo Excel (.xlsx) o CSV (.csv)</li>
                <li>Columnas: Cliente, Producto, Valor, Fecha, etc.</li>
                <li>Máximo 1000 registros por carga</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Plantilla de Ejemplo</CardTitle>
            <CardDescription>
              Descarga la plantilla para asegurar el formato correcto
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline">
              Descargar Plantilla Excel
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

