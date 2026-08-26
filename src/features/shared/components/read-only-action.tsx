'use client'

import type { ReactNode } from 'react'
import { useReadOnlyRole } from '@/features/shared/hooks/use-read-only-role'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/features/shared/ui/tooltip'

export interface ReadOnlyActionProps {
	children: ReactNode
}

/**
 * Wraps a mutating/export action (Button, etc.) to show an explanatory
 * tooltip when the current session's role is read-only. Consumers are
 * responsible for passing `disabled` to their own control themselves — this
 * wrapper composes with existing disabled logic via `||`, it never mutates
 * the child element.
 *
 * A disabled Radix `TooltipTrigger` emits no pointer events, so we wrap
 * children in a `<span tabIndex={0}>` trigger instead, and only render the
 * tooltip machinery when `isReadOnly` — otherwise `children` render
 * untouched (zero behavior change for write-capable roles).
 */
export function ReadOnlyAction({ children }: ReadOnlyActionProps) {
	const { isReadOnly, reason } = useReadOnlyRole()

	if (!isReadOnly) {
		return <>{children}</>
	}

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<span tabIndex={0}>{children}</span>
				</TooltipTrigger>
				<TooltipContent>{reason}</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	)
}
