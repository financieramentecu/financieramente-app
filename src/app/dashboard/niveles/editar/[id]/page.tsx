import { auth } from '@/auth'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { LevelEditClient } from './level-edit-client'
import { notFound } from 'next/navigation'

interface EditLevelPageProps {
	params: Promise<{ id: string }>
}

/**
 * Edit Level Page (Server Component)
 */
export default async function EditLevelPage({ params }: EditLevelPageProps) {
	const session = await auth()

	if (!session?.user) {
		return null
	}

	const { id } = await params
	const levelId = parseInt(id)

	if (Number.isNaN(levelId)) {
		notFound()
	}

	return (
		<DashboardLayout currentPage="Editar Nivel (Jerarquía)">
			<LevelEditClient id={levelId} />
		</DashboardLayout>
	)
}
