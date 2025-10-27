export interface Business {
  id: string
  identification: string
  user: {
    avatar: string
    name: string
  }
  email: string
  termPeriod: string
  date: string
  value: number
  product: string
  status: 'Iniciado' | 'Venta Descuento' | 'Emitido'
}

export interface StatsData {
  title: string
  value: string | number
  change: number
  trend: 'up' | 'down' | 'neutral'
  description?: string
}

export interface BusinessSearchParams {
  searchType: 'agent' | 'client' | 'id'
  searchCriteria: string
}

export type BusinessStatus = 'Iniciado' | 'Venta Descuento' | 'Emitido'

export interface SearchTypeOption {
  value: 'agent' | 'client' | 'id'
  label: string
}

export interface UserAvatar {
  name: string
  color: string
}





