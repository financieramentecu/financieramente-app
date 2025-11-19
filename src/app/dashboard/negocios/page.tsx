"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/layouts/DashboardLayout"
import { MisNegociosPage } from "@/pages/MisNegociosPage"
import { Business, StatsData, BusinessSearchParams } from "@/types/business"
import { useAuthSession } from "@/hooks/use-auth-session"
import { UserRole } from "@/lib/auth/roles"

/**
 * Página de Negocios
 * 
 * Muestra el listado de negocios con estadísticas, búsqueda y tabla.
 * Para agentes, solo muestra sus propios negocios.
 * Para otros roles, muestra todos los negocios según permisos.
 */
export default function NegociosPage() {
  const router = useRouter()
  const { session } = useAuthSession()
  const [businessData, setBusinessData] = useState<Business[]>([])
  const [statsData, setStatsData] = useState<StatsData[]>([])
  const [loading, setLoading] = useState(true)

  // Cargar negocios desde la API
  useEffect(() => {
    async function loadBusinesses() {
      try {
        setLoading(true)
        const response = await fetch("/api/business")
        
        if (!response.ok) {
          throw new Error("Error al cargar negocios")
        }

        const data = await response.json()
        setBusinessData(data.businesses || [])

        // Calcular estadísticas básicas
        const total = data.total || 0
        const ventasEfectuadas = data.businesses?.filter(
          (b: Business) => b.status === "Venta Efectuada" || b.status === "Venta Efectuado"
        ).length || 0
        const emitidos = data.businesses?.filter(
          (b: Business) => b.status === "Emitido"
        ).length || 0

        setStatsData([
          {
            title: "Resumen Negocios Efectuados",
            value: ventasEfectuadas.toString(),
            change: 0,
            trend: "neutral",
            description: "Total de ventas efectuadas",
          },
          {
            title: "Total Negocios Emitidos",
            value: emitidos.toString(),
            change: 0,
            trend: "neutral",
            description: "Total de negocios emitidos",
          },
        ])
      } catch (error) {
        console.error("Error loading businesses:", error)
        setBusinessData([])
        setStatsData([])
      } finally {
        setLoading(false)
      }
    }

    loadBusinesses()
  }, [])

  const handleSearch = (params: BusinessSearchParams) => {
    console.log("Búsqueda:", params)
    // TODO: Implementar lógica de búsqueda
  }

  const handleCreateNew = () => {
    router.push("/dashboard/negocios/crear")
  }

  const handleShowAll = () => {
    console.log("Mostrar todos los negocios")
    // TODO: Implementar lógica para mostrar todos
  }

  const handleAddBusiness = () => {
    router.push("/dashboard/negocios/crear")
  }

  const handleEditBusiness = (business: Business) => {
    console.log("Editar negocio:", business)
    // TODO: Implementar lógica para editar negocio
  }

  const handleGlobalSearch = (query: string) => {
    console.log("Búsqueda global:", query)
    // TODO: Implementar lógica de búsqueda global
  }

  return (
    <DashboardLayout currentPage="Negocio">
      <div className="space-y-6">
        {/* Contenido de la página de negocios */}
        <MisNegociosPage
          businessData={businessData}
          statsData={statsData}
          onSearch={handleSearch}
          onCreateNew={handleCreateNew}
          onShowAll={handleShowAll}
          onAddBusiness={handleAddBusiness}
          onEditBusiness={handleEditBusiness}
          onGlobalSearch={handleGlobalSearch}
        />
      </div>
    </DashboardLayout>
  )
}

