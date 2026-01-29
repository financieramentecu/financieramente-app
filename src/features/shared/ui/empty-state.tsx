'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
	icon?: React.ReactNode
	title: string
	description?: string
	action?: React.ReactNode
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
	({ className, icon, title, description, action, ...props }, ref) => {
		return (
			<div
				ref={ref}
				className={cn(
					'flex flex-col items-center justify-center py-12 text-center',
					className
				)}
				{...props}
			>
				{icon && (
					<div className="mb-4 flex justify-center text-muted-foreground">
						{icon}
					</div>
				)}
				<p className="text-base font-medium text-foreground">{title}</p>
				{description && (
					<p className="mt-1 max-w-sm text-sm text-muted-foreground">
						{description}
					</p>
				)}
				{action && <div className="mt-4">{action}</div>}
			</div>
		)
	}
)
EmptyState.displayName = 'EmptyState'

export { EmptyState }
