"use client"

import React from 'react'
import { StatsCard } from '@/components/ui/StatsCard'
import { StatsData } from '@/types/business'

interface StatsOverviewProps {
  statsData: StatsData[]
}

export function StatsOverview({ statsData }: StatsOverviewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-8">
      {statsData?.map((stat, index) => (
        <StatsCard
          key={index}
          title={stat.title}
          value={stat.value}
          change={stat.change}
          trend={stat.trend}
          description={stat.description}
        />
      )) || []}
    </div>
  )
}
