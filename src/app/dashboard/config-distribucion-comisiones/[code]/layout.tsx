'use client'

import React from 'react'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'

export default function ConfigDistribucionComisionesCodeLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return (
		<DashboardLayout currentPage="Config. distribución de comisiones">
			{children}
		</DashboardLayout>
	)
}
