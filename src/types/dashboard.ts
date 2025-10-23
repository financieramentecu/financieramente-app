export interface DashboardLayoutProps {
  children: React.ReactNode
  currentPage: string
  user: User
  navItems: NavItem[]
}

export interface PageHeaderProps {
  title: string
  user: User
  onUserAction?: (action: string) => void
}

export interface SidebarProps {
  navItems: NavItem[]
  currentUser: User
  currentPage: string
  onNavItemClick?: (href: string) => void
}

export interface DataTableColumn<T> {
  key: keyof T
  header: string
  cellRenderer?: (value: any, row: T) => React.ReactNode
  sortable?: boolean
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  data: T[]
  pagination?: {
    currentPage: number
    pageSize: number
    totalItems: number
    onPageChange: (page: number) => void
  }
  onRowAction?: (row: T, action: string) => void
  searchable?: boolean
  onGlobalSearch?: (query: string) => void
  loading?: boolean
}

export interface StatsCardProps {
  title: string
  value: string | number
  change?: number
  trend?: 'up' | 'down' | 'neutral'
  icon?: React.ReactNode
  description?: string
}

import { User } from './user'
import { NavItem } from './user'





