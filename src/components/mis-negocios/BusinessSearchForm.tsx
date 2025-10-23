"use client"

import React, { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { BusinessSearchParams } from '@/types/business'

interface BusinessSearchFormProps {
  onSearch: (params: BusinessSearchParams) => void
  onShowAll: () => void
}

export function BusinessSearchForm({ onSearch, onShowAll }: BusinessSearchFormProps) {
  const [searchType, setSearchType] = useState<'agent' | 'client' | 'id'>('agent')
  const [searchCriteria, setSearchCriteria] = useState('')

  const handleSearch = () => {
    onSearch({
      searchType,
      searchCriteria
    })
  }

  const handleShowAll = () => {
    setSearchCriteria('')
    onShowAll()
  }

  return (
    <div className="space-y-4 p-6 border rounded-lg bg-card">
      <div className="space-y-4">
        <div>
          <Label className="text-base font-medium">Tipo de Búsqueda</Label>
          <RadioGroup
            value={searchType}
            onValueChange={(value) => setSearchType(value as 'agent' | 'client' | 'id')}
            className="flex flex-col space-y-2 mt-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="agent" id="agent" />
              <Label htmlFor="agent">Nombre del agente</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="client" id="client" />
              <Label htmlFor="client">Cliente</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="id" id="id" />
              <Label htmlFor="id">Cédula</Label>
            </div>
          </RadioGroup>
        </div>

        <div>
          <Label htmlFor="search-criteria" className="text-base font-medium">
            Criterio de Búsqueda
          </Label>
          <Input
            id="search-criteria"
            placeholder="Ingrese el criterio de búsqueda..."
            value={searchCriteria}
            onChange={(e) => setSearchCriteria(e.target.value)}
            className="mt-2"
          />
        </div>

        <div className="flex gap-3">
          <Button onClick={handleSearch} disabled={!searchCriteria.trim()}>
            Buscar
          </Button>
          <Button variant="outline" onClick={handleShowAll}>
            Mostrar todos
          </Button>
        </div>
      </div>
    </div>
  )
}
