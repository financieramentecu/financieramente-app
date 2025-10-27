"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp } from 'lucide-react'
import { StatsData } from '@/types/business'

interface StatsCardsSectionProps {
  statsData: StatsData[]
}

// Componente para el gráfico pequeño ondulado
const MiniChart = ({ color, isLarge = false }: { color: string, isLarge?: boolean }) => {
  const height = isLarge ? 40 : 20
  const width = isLarge ? 80 : 60
  
  return (
    <div className={`${isLarge ? 'mt-2' : 'mt-1'} ${isLarge ? 'h-10' : 'h-5'} w-full`}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        <path
          d={`M 0 ${height/2} Q ${width/4} ${height/4} ${width/2} ${height/2} T ${width} ${height/2}`}
          stroke={color}
          strokeWidth="2"
          fill="none"
          className="opacity-60"
        />
        {isLarge && (
          <path
            d={`M 0 ${height/2 + 5} Q ${width/3} ${height/2 - 5} ${width/2} ${height/2 + 5} T ${width} ${height/2 - 3}`}
            stroke={color}
            strokeWidth="1.5"
            fill="none"
            className="opacity-40"
          />
        )}
      </svg>
    </div>
  )
}

export function StatsCardsSection({ statsData }: StatsCardsSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      {statsData.map((stat, index) => (
        <Card key={index} className="w-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">{stat.value}</div>
            
            {/* Porcentaje de cambio */}
            <div className="flex items-center gap-2 mb-3">
              <Badge 
                variant="outline" 
                className="bg-green-100 text-green-800 border-green-200 text-xs"
              >
                <TrendingUp className="h-3 w-3 mr-1" />
                +{stat.change}%
              </Badge>
            </div>

            {/* Gráficos pequeños */}
            <div className="flex items-end gap-2">
              {/* Gráfico verde pequeño */}
              <MiniChart color="#10b981" />
              
              {/* Gráfico naranja grande */}
              <MiniChart color="#f97316" isLarge />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
