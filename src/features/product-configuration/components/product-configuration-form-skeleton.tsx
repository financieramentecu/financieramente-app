'use client'

import React from 'react'
import { Skeleton } from '@/features/shared/ui/skeleton'
import {
	Card,
	CardContent,
	CardHeader,
} from '@/features/shared/ui/card'

export function ProductConfigurationFormSkeleton() {
	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-64" />
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{[1, 2, 3, 4].map((i) => (
							<div key={i} className="space-y-2">
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-10 w-full rounded-md" />
							</div>
						))}
					</div>
					<div className="space-y-2">
						<Skeleton className="h-4 w-16" />
						<Skeleton className="h-10 w-full rounded-md" />
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-72" />
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-10 w-full rounded-md" />
					</div>
				</CardContent>
			</Card>

			<div className="flex justify-end gap-3 pt-4">
				<Skeleton className="h-10 w-24 rounded-md" />
				<Skeleton className="h-10 w-36 rounded-md" />
			</div>
		</div>
	)
}
