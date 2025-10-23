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
  status: 'Emitido' | 'Venta Efectuado'
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

export type BusinessStatus = 'Emitido' | 'Venta Efectuado'





