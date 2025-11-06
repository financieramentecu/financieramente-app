"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { BusinessSearchForm } from './BusinessSearchForm'
import { BusinessSearchParams } from '@/types/business'
import { cn } from '@/lib/utils'

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
  const [activeMode, setActiveMode] = useState<'search' | 'create'>('search')

  return (
    <div className="space-y-6 mb-8">
      {/* Gestión de Negocios Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-primary">Gestión de Negocios</h2>
        <p className="text-muted-foreground">
          Busca y edita información de negocios registrados
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={() => setActiveMode('search')}
          variant={activeMode === 'search' ? 'default' : 'outline'}
          className={cn(
            activeMode === 'search' && 'bg-primary text-primary-foreground'
          )}
        >
          Búsqueda y edición
        </Button>
        <Button
          onClick={() => {
            setActiveMode('create')
            onCreateNew()
          }}
          variant={activeMode === 'create' ? 'default' : 'outline'}
          className={cn(
            activeMode === 'create' && 'bg-primary text-primary-foreground'
          )}
        >
          Crear nuevo
        </Button>
      </div>

      {/* Search Section */}
      {activeMode === 'search' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-primary mb-2">Búsqueda de Negocios</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Busca negocios por nombre del agente, cliente o cédula del cliente
            </p>
          </div>
          <BusinessSearchForm 
            onSearch={onSearch}
            onShowAll={onShowAll}
          />
        </div>
      )}

      {/* Create Section */}
      {activeMode === 'create' && (
        <div className="p-6 border rounded-lg bg-card text-center">
          <h3 className="text-lg font-semibold mb-2">Crear Nuevo Negocio</h3>
          <p className="text-muted-foreground mb-4">
            Aquí podrás crear un nuevo negocio en el sistema
          </p>
          <Button onClick={onCreateNew}>
            Crear Negocio
          </Button>
        </div>
      )}
    </div>
  )
}
