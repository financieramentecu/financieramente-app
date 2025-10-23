export interface User {
  id: string
  name: string
  email: string
  avatar: string
  role: string
}

export interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  isActive: boolean
  subItems?: NavItem[]
}

export interface UserProfile {
  name: string
  email: string
  avatar: string
  role: string
  lastLogin?: string
}





