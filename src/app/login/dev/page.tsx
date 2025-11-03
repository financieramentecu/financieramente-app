"use client"

import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

/**
 * Página de Login de Desarrollo
 * 
 * SOLO DISPONIBLE EN MODO DESARROLLO
 * Permite hacer login sin Google OAuth para pruebas rápidas
 */
export default function DevLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("usuario@financieramentecu.com")
  const [name, setName] = useState("Usuario de Prueba")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Solo disponible en desarrollo
  if (process.env.NODE_ENV === "production") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>No Disponible</CardTitle>
            <CardDescription>
              Esta página solo está disponible en modo desarrollo.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const result = await signIn("credentials", {
        email,
        name,
        redirect: false,
        callbackUrl: "/dashboard",
      })

      if (result?.error) {
        setError(result.error)
        setIsSubmitting(false)
      } else if (result?.ok) {
        router.push("/dashboard")
      }
    } catch (err) {
      setError("Error al iniciar sesión")
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Login de Desarrollo</CardTitle>
          <CardDescription>
            Modo de prueba - No requiere Google OAuth
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@financieramentecu.com"
                required
              />
              <p className="text-xs text-muted-foreground">
                Debe ser un email de @financieramentecu.com
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Usuario de Prueba"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Iniciando sesión..." : "Iniciar Sesión (Dev)"}
            </Button>

            <div className="text-center">
              <Button
                type="button"
                variant="link"
                onClick={() => router.push("/login")}
                className="text-sm"
              >
                Usar login real con Google
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

