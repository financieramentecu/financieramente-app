"use client"

import React from 'react'

interface BusinessManagementHeaderProps {
  title?: string
  subtitle?: string
}

export function BusinessManagementHeader({ 
  title = "Gestión de Negocios",
  subtitle = "Busca y edita información de negocios registrados"
}: BusinessManagementHeaderProps) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        {title}
      </h1>
      <p className="text-lg text-gray-600">
        {subtitle}
      </p>
    </div>
  )
}
