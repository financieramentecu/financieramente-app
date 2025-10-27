"use client"

import React from 'react'
import { DataTable } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/button'
import { Business } from '@/types/business'
import { DataTableColumn } from '@/types/dashboard'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit } from 'lucide-react'

interface EnhancedBusinessTableProps {
  data: Business[]
  onAddBusiness: () => void
  onGlobalSearch: (query: string) => void
  onEditBusiness: (business: Business) => void
}

export function EnhancedBusinessTable({ 
  data, 
  onAddBusiness, 
  onGlobalSearch,
  onEditBusiness 
}: EnhancedBusinessTableProps) {
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
    switch (status) {
      case 'Iniciado':
        return (
          <Badge 
            variant="outline"
            className="bg-green-100 text-green-800 border-green-200"
          >
            {status}
          </Badge>
        )
      case 'Venta Descuento':
        return (
          <Badge 
            variant="outline"
            className="bg-orange-100 text-orange-800 border-orange-200"
          >
            {status}
          </Badge>
        )
      case 'Emitido':
        return (
          <Badge 
            variant="outline"
            className="bg-blue-100 text-blue-800 border-blue-200"
          >
            {status}
          </Badge>
        )
      default:
        return (
          <Badge variant="outline">
            {status}
          </Badge>
        )
    }
  }

  const columns: DataTableColumn<Business>[] = [
    {
      key: 'id',
      header: '# Negocio',
      cellRenderer: (value) => (
        <span className="font-medium text-gray-900">#{value}</span>
      )
    },
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
            <AvatarFallback className="bg-gray-200 text-gray-600">
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
      header: 'Plazo / periodo',
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
      header: 'Action',
      cellRenderer: (_, row) => (
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => onEditBusiness(row)}
          className="h-8 w-8 p-0"
        >
          <Edit className="h-4 w-4" />
        </Button>
      )
    }
  ]

  return (
    <div className="space-y-4">
      {/* Table Header with Add Button */}
      <div className="flex justify-end">
        <Button 
          onClick={onAddBusiness} 
          className="bg-teal-700 hover:bg-teal-800 text-white gap-2"
        >
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
