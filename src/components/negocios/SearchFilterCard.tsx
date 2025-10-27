"use client"

import React, { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search } from 'lucide-react'
import { BusinessSearchParams, SearchTypeOption, UserAvatar } from '@/types/business'

interface SearchFilterCardProps {
  onSearch: (params: BusinessSearchParams) => void
  onShowAll: () => void
  searchTypeOptions?: SearchTypeOption[]
  userAvatars?: UserAvatar[]
}

export function SearchFilterCard({ 
  onSearch, 
  onShowAll,
  searchTypeOptions = [
    { value: 'agent', label: 'Nombre del agente' },
    { value: 'client', label: 'Nombre del cliente' },
    { value: 'id', label: 'Cédula del cliente' }
  ],
  userAvatars = [
    { name: 'V', color: 'bg-blue-500' },
    { name: 'J', color: 'bg-amber-500' }
  ]
}: SearchFilterCardProps) {
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
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Búsqueda de Negocios</CardTitle>
        <p className="text-sm text-muted-foreground">
          Busca negocios por nombre del agente, cliente o cédula del cliente
        </p>
      </CardHeader>
      <CardContent className="p-6">
        {/* Layout responsivo */}
        <div className="flex flex-col md:flex-row gap-4 md:items-end">
          {/* Tipo de Búsqueda */}
          <div className="w-full md:w-auto md:flex-shrink-0">
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Tipo de Búsqueda</Label>
            <Select value={searchType} onValueChange={(value) => setSearchType(value as 'agent' | 'client' | 'id')}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {searchTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Criterio de Búsqueda */}
          <div className="flex-1 min-w-0">
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Criterio de Búsqueda</Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Ej. María López"
                value={searchCriteria}
                onChange={(e) => setSearchCriteria(e.target.value)}
                className="flex-1 min-w-0"
              />
              <div className="flex gap-2 flex-shrink-0">
                <Button 
                  onClick={handleSearch} 
                  disabled={!searchCriteria.trim()}
                  className="bg-teal-700 hover:bg-teal-800 text-white px-4"
                  size="sm"
                >
                  <Search className="h-4 w-4 mr-1" />
                  Buscar
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleShowAll}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 px-4"
                  size="sm"
                >
                  Mostrar todos
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
