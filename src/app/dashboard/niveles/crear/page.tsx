import { auth } from '@/auth'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { LevelCreateClient } from './level-create-client'

/**
 * Create Level Page (Server Component)
 */
export default async function CreateLevelPage() {
	const session = await auth()

	if (!session?.user) {
		return null
	}

	return (
		<DashboardLayout currentPage="Nuevo Nivel (Jerarquía)">
			<LevelCreateClient />
		</DashboardLayout>
	)
}
