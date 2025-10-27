"use client"

import React, { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

interface EnhancedTabsProps {
  onTabChange?: (tab: string) => void
  children: React.ReactNode
}

export function EnhancedTabs({ onTabChange, children }: EnhancedTabsProps) {
  const [activeTab, setActiveTab] = useState('search')

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    onTabChange?.(value)
  }

  return (
    <div className="mb-8">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gray-100 p-1">
          <TabsTrigger 
            value="search" 
            className={cn(
              "data-[state=active]:bg-teal-700 data-[state=active]:text-white",
              "data-[state=inactive]:bg-transparent data-[state=inactive]:text-gray-600",
              "transition-colors duration-200"
            )}
          >
            Búsqueda y edición
          </TabsTrigger>
          <TabsTrigger 
            value="create"
            className={cn(
              "data-[state=active]:bg-teal-700 data-[state=active]:text-white",
              "data-[state=inactive]:bg-transparent data-[state=inactive]:text-gray-600",
              "transition-colors duration-200"
            )}
          >
            Crear nuevo
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="search" className="mt-6">
          {children}
        </TabsContent>
        
        <TabsContent value="create" className="mt-6">
          <div className="p-6 border rounded-lg bg-card text-center">
            <h3 className="text-lg font-semibold mb-2">Crear Nuevo Negocio</h3>
            <p className="text-muted-foreground mb-4">
              Aquí podrás crear un nuevo negocio en el sistema
            </p>
            <button 
              className="px-4 py-2 bg-teal-700 text-white rounded-md hover:bg-teal-800 transition-colors"
            >
              Crear Negocio
            </button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
