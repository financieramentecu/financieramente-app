"use client"

import React, { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BusinessSearchForm } from './BusinessSearchForm'
import { BusinessSearchParams } from '@/types/business'

interface BusinessManagementSectionProps {
  onSearch: (params: BusinessSearchParams) => void
  onCreateNew: () => void
  onShowAll: () => void
}

export function BusinessManagementSection({ 
  onSearch, 
  onCreateNew, 
  onShowAll 
}: BusinessManagementSectionProps) {
  const [activeTab, setActiveTab] = useState('search')

  return (
    <div className="mb-8">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="search">Búsqueda y edición</TabsTrigger>
          <TabsTrigger value="create">Crear nuevo</TabsTrigger>
        </TabsList>
        
        <TabsContent value="search" className="mt-6">
          <BusinessSearchForm 
            onSearch={onSearch}
            onShowAll={onShowAll}
          />
        </TabsContent>
        
        <TabsContent value="create" className="mt-6">
          <div className="p-6 border rounded-lg bg-card text-center">
            <h3 className="text-lg font-semibold mb-2">Crear Nuevo Negocio</h3>
            <p className="text-muted-foreground mb-4">
              Aquí podrás crear un nuevo negocio en el sistema
            </p>
            <button 
              onClick={onCreateNew}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Crear Negocio
            </button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
