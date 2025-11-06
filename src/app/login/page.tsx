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
  
  // Detectar modo mock: explícito o si no hay Google configurado en desarrollo
  const useDevMode = 
    process.env.NODE_ENV === "development" && 
    (process.env.NEXT_PUBLIC_USE_DEV_AUTH === "true" || !process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID)

  const callbackUrl = searchParams?.get("callbackUrl") || "/dashboard"

  const handleGoogleSignIn = async () => {
    // Si está en modo mock, usar credenciales en lugar de Google OAuth
    if (useDevMode) {
      // En modo mock, simular login de Google con usuario mock
      try {
        setIsSubmitting(true)
        const mockEmail = "usuario@financieramentecu.com"
        const result = await signIn("credentials", {
          email: mockEmail,
          name: "Usuario Mock",
          redirect: false,
          callbackUrl,
        })

        if (result?.error) {
          toast.error("Error al iniciar sesión", {
            description: result.error,
          })
        } else if (result?.ok) {
          toast.success("Login mock exitoso", {
            description: "Sesión iniciada en modo desarrollo.",
          })
          router.push(callbackUrl)
        }
      } catch (error) {
        console.error("Error en autenticación mock:", error)
        toast.error("Error inesperado", {
          description: "Ocurrió un error al intentar iniciar sesión.",
        })
      } finally {
        setIsSubmitting(false)
      }
      return
    }

    // Login real con Google OAuth
    try {
      setIsSubmitting(true)
      await signIn("google", {
        callbackUrl,
        redirect: true,
      })
      // Si redirect: true, signIn no retorna (la redirección maneja el flujo)
    } catch (error) {
      console.error("Error en autenticación:", error)
      toast.error("Error inesperado", {
        description: "Ocurrió un error al intentar iniciar sesión.",
      })
      setIsSubmitting(false)
    }
  }

  const handleEmailSignIn: EmailSignInFormProps["onSubmit"] = async (email) => {
    // Si está en modo mock, usar credenciales en lugar de Google OAuth
    if (useDevMode) {
      // En modo mock, hacer login directo con el email
      try {
        setIsSubmitting(true)
        const result = await signIn("credentials", {
          email,
          name: email.split("@")[0] || "Usuario",
          redirect: false,
          callbackUrl,
        })

        if (result?.error) {
          toast.error("Error al iniciar sesión", {
            description: result.error,
          })
        } else if (result?.ok) {
          router.push(callbackUrl)
        }
      } catch (error) {
        console.error("Error en autenticación:", error)
        toast.error("Error inesperado", {
          description: "Ocurrió un error al intentar iniciar sesión.",
        })
      } finally {
        setIsSubmitting(false)
      }
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
      label: useDevMode ? "Continuar con Google (Mock)" : "Continuar con Google",
      icon: <GoogleIcon className="size-5" />,
      onClick: handleGoogleSignIn,
      buttonProps: {
        disabled: isSubmitting,
      },
    },
  ]

  return (
    <LoginView
      emailForm={{
        placeholder: "usuario@financieramentecu.com",
        submitLabel: useDevMode ? "Login Mock" : "Ingresar con correo",
        isSubmitting,
        onSubmit: handleEmailSignIn,
      }}
      socialProviders={socialProviders}
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

