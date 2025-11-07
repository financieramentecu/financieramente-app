"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/layouts/DashboardLayout"
import { MisNegociosPage } from "@/pages/MisNegociosPage"
import { Business, StatsData, BusinessSearchParams } from "@/types/business"

/**
 * Página de Negocios
 * 
 * Muestra el listado de negocios con estadísticas, búsqueda y tabla
 */
export default function NegociosPage() {
  const router = useRouter()
  const [businessData, setBusinessData] = useState<Business[]>([
    {
      id: "20462",
      identification: "1060",
      user: {
        avatar: "",
        name: "Hat",
      },
      email: "john.agude@example.com",
      termPeriod: "24/3",
      date: "2022-05-13",
      value: 400.95,
      product: "Transfer Bank",
      status: "Emitido",
    },
    {
      id: "34304",
      identification: "1053",
      user: {
        avatar: "",
        name: "Bag",
      },
      email: "Andres.ag@example.com",
      termPeriod: "48/1",
      date: "2022-09-06",
      value: 899.95,
      product: "Transfer Bank",
      status: "Venta Efectuado",
    },
  ])

  const [statsData] = useState<StatsData[]>([
    {
      title: "Resumen Negocios Efectuados",
      value: "635",
      change: 21.01,
      trend: "up",
      description: "Último mes",
    },
    {
      title: "Total Negocios Emitidos",
      value: "325k",
      change: 18.34,
      trend: "up",
      description: "Último mes",
    },
  ])

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

