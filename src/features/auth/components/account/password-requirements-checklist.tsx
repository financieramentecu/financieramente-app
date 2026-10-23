'use client'

import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PASSWORD_REQUIREMENTS } from '@/features/auth/lib/account-password.schema'

interface PasswordRequirementsChecklistProps {
	password: string
}

/**
 * Live checklist shown under the password field on activate/reset screens.
 * Rules come from `PASSWORD_REQUIREMENTS` — the same source the Zod schema
 * uses — so this can never drift from what the server actually accepts.
 */
export function PasswordRequirementsChecklist({
	password,
}: PasswordRequirementsChecklistProps) {
	return (
		<ul className="space-y-1" aria-label="Requisitos de la contraseña">
			{PASSWORD_REQUIREMENTS.map((requirement) => {
				const met = requirement.test(password)
				return (
					<li
						key={requirement.id}
						data-met={met}
						className={cn(
							'flex items-center gap-1.5 text-xs transition-colors',
							met ? 'text-emerald-600' : 'text-muted-foreground'
						)}
					>
						{met ? (
							<Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
						) : (
							<X className="h-3.5 w-3.5 shrink-0" aria-hidden />
						)}
						{requirement.label}
					</li>
				)
			})}
		</ul>
	)
}
