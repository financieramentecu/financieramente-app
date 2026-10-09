import { redirect } from 'next/navigation'
import { DocumentTypesAdmin } from '@/features/document-types/components/document-types-admin'
import { requireSystemAdmin } from '@/features/document-types/lib/require-system-admin'

export const metadata = {
	title: 'Tipos de Documento',
	description: 'Administración de tipos de documento de identidad',
}

export default async function DocumentTypesPage() {
	const guard = await requireSystemAdmin()
	if (!guard.ok) {
		if (guard.status === 401) {
			redirect('/login')
		}
		redirect('/access-denied?reason=no_permissions')
	}

	return <DocumentTypesAdmin />
}
