'use client'

import React from 'react'
import Link from 'next/link'
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/features/shared/ui/card'
import { cn } from '@/lib/utils'

export interface AdminCardProps {
	title: string
	description: string
	href: string
	count?: number
	icon: React.ReactNode
	className?: string
}

export function AdminCard({
	title,
	description,
	href,
	count,
	icon,
	className,
}: AdminCardProps) {
	return (
		<Link href={href} className={cn('block', className)}>
			<Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
				<CardHeader>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="p-2 bg-primary/10 rounded-lg">{icon}</div>
							<div>
								<CardTitle className="text-lg">{title}</CardTitle>
								<CardDescription>{description}</CardDescription>
							</div>
						</div>
						{count !== undefined && (
							<div className="text-2xl font-bold text-primary">{count}</div>
						)}
					</div>
				</CardHeader>
			</Card>
		</Link>
	)
}
