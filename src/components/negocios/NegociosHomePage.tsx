"use client"

import React, { useState } from 'react'
import { StatsCardsSection } from './StatsCardsSection'
import { BusinessManagementHeader } from './BusinessManagementHeader'
import { EnhancedTabs } from './EnhancedTabs'
import { SearchFilterCard } from './SearchFilterCard'
import { EnhancedBusinessTable } from './EnhancedBusinessTable'
import { mockNegociosStatsData, mockNegociosBusinessData } from '../../data/mockNegociosData'
import { BusinessSearchParams, Business } from '../../types/business'

export function NegociosHomePage() {
  const [businessData, setBusinessData] = useState<Business[]>(mockNegociosBusinessData)
  const [filteredData, setFilteredData] = useState<Business[]>(mockNegociosBusinessData)

  const handleSearch = (params: BusinessSearchParams) => {
    console.log('Search params:', params)
    // Aquí implementarías la lógica de búsqueda real
    // Por ahora solo mostramos todos los datos
    setFilteredData(businessData)
  }

  const handleShowAll = () => {
    console.log('Show all businesses')
    setFilteredData(businessData)
  }

  const handleAddBusiness = () => {
    console.log('Add new business')
    // Aquí implementarías la lógica para agregar un nuevo negocio
  }

  const handleEditBusiness = (business: Business) => {
    console.log('Edit business:', business)
    // Aquí implementarías la lógica para editar un negocio
  }

  const handleGlobalSearch = (query: string) => {
    console.log('Global search:', query)
    // Aquí implementarías la búsqueda global en la tabla
  }

  const handleTabChange = (tab: string) => {
    console.log('Tab changed:', tab)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Tarjetas de Estadísticas */}
        <StatsCardsSection statsData={mockNegociosStatsData} />

        {/* Título y Subtítulo */}
        <BusinessManagementHeader />

        {/* Tabs */}
        <EnhancedTabs onTabChange={handleTabChange}>
          {/* Card de Filtros de Búsqueda */}
          <SearchFilterCard 
            onSearch={handleSearch}
            onShowAll={handleShowAll}
          />
        </EnhancedTabs>

        {/* Tabla de Negocios */}
        <EnhancedBusinessTable
          data={filteredData}
          onAddBusiness={handleAddBusiness}
          onGlobalSearch={handleGlobalSearch}
          onEditBusiness={handleEditBusiness}
        />
      </div>
    </div>
  )
}
