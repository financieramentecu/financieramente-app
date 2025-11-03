"use client"

import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { LoginView, type EmailSignInFormProps } from "@/components/auth/login"
import { GoogleIcon } from "@/components/auth/login/social-sign-in"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import type { SocialProvider } from "@/components/auth/login/social-sign-in"

/**
 * Página de Login
 * 
 * Integra el componente LoginView maquetado con NextAuth
 * Maneja la autenticación con Google OAuth
 */
export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard"

  const handleGoogleSignIn = async () => {
    try {
      setIsSubmitting(true)
      const result = await signIn("google", {
        callbackUrl,
        redirect: true,
      })

      if (result?.error) {
        toast.error("Error al iniciar sesión", {
          description: "No se pudo autenticar con Google. Verifica que uses un correo corporativo.",
        })
      }
    } catch (error) {
      console.error("Error en autenticación:", error)
      toast.error("Error inesperado", {
        description: "Ocurrió un error al intentar iniciar sesión.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEmailSignIn: EmailSignInFormProps["onSubmit"] = async (email) => {
    // Si está en modo desarrollo, usar credenciales
    const useDevMode = process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_USE_DEV_AUTH === "true"
    
    if (useDevMode) {
      // Redirigir a página de login de desarrollo
      router.push("/login/dev")
      return
    }

    // Para Google OAuth, redirigimos al flujo de Google
    toast.info("Usa Google para iniciar sesión", {
      description: "Por favor, usa el botón de Google para autenticarte.",
    })
    await handleGoogleSignIn()
  }

  const socialProviders: SocialProvider[] = [
    {
      id: "google",
      label: "Continuar con Google",
      icon: <GoogleIcon className="size-5" />,
      onClick: handleGoogleSignIn,
      buttonProps: {
        disabled: isSubmitting,
      },
    },
  ]

  const useDevMode = process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_USE_DEV_AUTH === "true"

  return (
    <LoginView
      emailForm={{
        placeholder: "usuario@financieramentecu.com",
        submitLabel: useDevMode ? "Modo Desarrollo" : "Ingresar con correo",
        isSubmitting,
        onSubmit: handleEmailSignIn,
      }}
      socialProviders={useDevMode ? [] : socialProviders}
      termsLink={{
        label: "Términos y condiciones",
        href: "#",
      }}
      auxiliaryContent={
        useDevMode ? (
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-2">
              Modo desarrollo activado
            </p>
            <Button
              variant="link"
              size="sm"
              onClick={() => router.push("/login/dev")}
              className="text-xs"
            >
              Ir a login de desarrollo
            </Button>
          </div>
        ) : null
      }
    />
  )
}

