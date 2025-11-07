"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/layouts/DashboardLayout"
import { CreateBusinessForm } from "@/components/ui/create-business-form"
import type { BusinessFormData } from "@/types/business-form"
import { toast } from "sonner"

/**
 * Página de Crear Negocio
 * 
 * Muestra el formulario para crear un nuevo negocio
 */
export default function CrearNegocioPage() {
  const router = useRouter()

  const handleSubmit = async (data: BusinessFormData) => {
    try {
      // TODO: Implementar llamada a API para crear negocio
      console.log("Datos del formulario:", data)
      
      toast.success("Negocio creado exitosamente", {
        description: "El negocio ha sido registrado correctamente.",
      })

      // Redirigir a la lista de negocios después de crear
      router.push("/dashboard/negocios")
    } catch (error) {
      console.error("Error al crear negocio:", error)
      toast.error("Error al crear negocio", {
        description: "Ocurrió un error al intentar crear el negocio. Por favor, intenta de nuevo.",
      })
    }
  }

  const handleCancel = () => {
    router.push("/dashboard/negocios")
  }

  return (
    <DashboardLayout currentPage="Crear Negocio">
      <div className="space-y-6">
        {/* Formulario de crear negocio */}
        <CreateBusinessForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </div>
    </DashboardLayout>
  )
}

