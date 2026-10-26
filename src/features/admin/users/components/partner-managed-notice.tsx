import Link from 'next/link'
import { Info } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/features/shared/ui/alert'
import { PARTNER_MANAGED_ERROR } from '../lib/partner-guard'

/**
 * Shown on the user detail of a partner: the users module is read-only for
 * partners (PM-07), the server refuses edits regardless of the UI.
 */
export function PartnerManagedNotice() {
	return (
		<Alert>
			<Info className="h-4 w-4" />
			<AlertTitle>Cuenta de Partner</AlertTitle>
			<AlertDescription>
				<p>{PARTNER_MANAGED_ERROR}.</p>
				<Link
					href="/dashboard/admin/partners"
					className="font-medium underline underline-offset-4"
				>
					Ir a Partners
				</Link>
			</AlertDescription>
		</Alert>
	)
}
