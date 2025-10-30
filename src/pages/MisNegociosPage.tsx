"use client"

import React from 'react'
import { StatsOverview } from '@/components/mis-negocios/StatsOverview'
import { BusinessManagementSection } from '@/components/mis-negocios/BusinessManagementSection'
import { BusinessTableSection } from '@/components/mis-negocios/BusinessTableSection'
import { Business, StatsData, BusinessSearchParams } from '@/types/business'

interface MisNegociosPageProps {
  businessData?: Business[]
  statsData?: StatsData[]
  onSearch?: (params: BusinessSearchParams) => void
  onCreateNew?: () => void
  onShowAll?: () => void
  onAddBusiness?: () => void
  onEditBusiness?: (business: Business) => void
  onGlobalSearch?: (query: string) => void
}

export function MisNegociosPage({
  businessData = [],
  statsData = [],
  onSearch = () => {},
  onCreateNew = () => {},
  onShowAll = () => {},
  onAddBusiness = () => {},
  onEditBusiness = () => {},
  onGlobalSearch = () => {}
}: MisNegociosPageProps) {
  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <StatsOverview statsData={statsData} />

      {/* Business Management Section */}
      <BusinessManagementSection 
        onSearch={onSearch}
        onCreateNew={onCreateNew}
        onShowAll={onShowAll}
      />

      {/* Business Table Section */}
      <BusinessTableSection
        data={businessData}
        onAddBusiness={onAddBusiness}
        onGlobalSearch={onGlobalSearch}
        onEditBusiness={onEditBusiness}
      />
    </div>
  )
}
