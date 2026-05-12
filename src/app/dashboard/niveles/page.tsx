import { auth } from '@/auth'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { LevelsPageClient } from './levels-page-client'

/**
 * Levels List Page (Server Component)
 */
export default async function LevelsPage() {
	const session = await auth()

	if (!session?.user) {
		return null
	}

	return (
		<DashboardLayout currentPage="Niveles">
			<LevelsPageClient />
		</DashboardLayout>
	)
}
