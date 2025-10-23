"use client"

import React from 'react'
import { DataTable } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/button'
import { Business } from '@/types/business'
import { DataTableColumn } from '@/types/dashboard'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Plus } from 'lucide-react'

interface BusinessTableSectionProps {
  data: Business[]
  onAddBusiness: () => void
  onGlobalSearch: (query: string) => void
  onEditBusiness: (business: Business) => void
}

export function BusinessTableSection({ 
  data, 
  onAddBusiness, 
  onGlobalSearch,
  onEditBusiness 
}: BusinessTableSectionProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO')
  }

  const getStatusBadge = (status: string) => {
    const isEmitido = status === 'Emitido'
    return (
      <Badge 
        variant={isEmitido ? "default" : "secondary"}
        className={isEmitido ? "bg-primary/10 text-primary border-primary/20" : "bg-secondary/10 text-secondary-foreground border-secondary/20"}
      >
        {status}
      </Badge>
    )
  }

  const columns: DataTableColumn<Business>[] = [
    {
      key: 'identification',
      header: 'Identificación',
      cellRenderer: (value) => (
        <span className="font-medium">{value}</span>
      )
    },
    {
      key: 'user',
      header: 'Usuario',
      cellRenderer: (user) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback>
              {user.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium">{user.name}</span>
        </div>
      )
    },
    {
      key: 'email',
      header: 'Email',
      cellRenderer: (value) => (
        <span className="text-muted-foreground">{value}</span>
      )
    },
    {
      key: 'termPeriod',
      header: 'Plazo',
      cellRenderer: (value) => (
        <span>{value}</span>
      )
    },
    {
      key: 'date',
      header: 'Fecha',
      cellRenderer: (value) => formatDate(value)
    },
    {
      key: 'value',
      header: 'Valor',
      cellRenderer: (value) => (
        <span className="font-medium">{formatCurrency(value)}</span>
      )
    },
    {
      key: 'product',
      header: 'Producto',
      cellRenderer: (value) => (
        <span>{value}</span>
      )
    },
    {
      key: 'status',
      header: 'Estado',
      cellRenderer: (value) => getStatusBadge(value)
    },
    {
      key: 'actions',
      header: 'Acciones',
      cellRenderer: (_, row) => (
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => onEditBusiness(row)}
        >
          Editar
        </Button>
      )
    }
  ]

  return (
    <div className="space-y-4">
      {/* Table Header with Add Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Lista de Negocios</h3>
        <Button onClick={onAddBusiness} className="gap-2">
          <Plus className="h-4 w-4" />
          Agregar negocio
        </Button>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={data}
        searchable={true}
        onGlobalSearch={onGlobalSearch}
        pagination={{
          currentPage: 1,
          pageSize: 10,
          totalItems: data.length,
          onPageChange: (page) => console.log('Page changed:', page)
        }}
      />
    </div>
  )
}
