import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import {
	buildDefaultDateSeedQuery,
	toUrlSearchParams,
} from '@/features/negocios/lib/default-date-filter'
import type { PageSearchParams } from '@/features/negocios/lib/default-date-filter'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { NegociosPageClient } from './negocios-page-client'
import { NegociosPageSkeleton } from '@/features/negocios/components/NegociosPageSkeleton'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { getNegociosInitialData } from '@/features/negocios/services/negocios-initial-data.server'
import type { UserWithRole } from '@/features/negocios/types/business.types'

/**
 * Loads the first page of the list and the KPIs on the server, so the client
 * renders with data instead of fetching after hydration. Streamed inside
 * Suspense: the dashboard shell paints while the queries run.
 */
async function NegociosPageData({
	currentUser,
	searchParams,
}: {
	currentUser: UserWithRole | null
	searchParams: PageSearchParams
}) {
	const initialData = currentUser
		? await getNegociosInitialData(currentUser, toUrlSearchParams(searchParams))
		: undefined

	return (
		<NegociosPageClient
			currentUser={currentUser ?? undefined}
			initialData={initialData}
		/>
	)
}

/**
 * Negocios page (Server Component): resolves the session and user, seeds the
 * role's default date filter, and streams the initial data to the client.
 */
export default async function NegociosPage({
	searchParams,
}: {
	searchParams?: Promise<PageSearchParams>
}) {
	const session = await auth()

	if (!session?.user) {
		return null
	}

	// Await searchParams (Next.js 15: searchParams is a Promise in server components)
	const resolvedSearchParams = searchParams ? await searchParams : {}

	// Seed the role's default date filter before rendering, so the client
	// mounts with it already in the URL and the list is loaded only once.
	// The session role is enough to decide it, so redirect before the user
	// lookup instead of paying for it twice.
	const earlySeedQuery = buildDefaultDateSeedQuery(
		session.user.role ?? undefined,
		resolvedSearchParams
	)
	if (earlySeedQuery) {
		redirect(`/dashboard/negocios?${earlySeedQuery}`)
	}

	const currentUser = await getCurrentUserByEmail(session.user.email)

	// The database role is authoritative: cover a session role that is missing
	// or out of date.
	const seedQuery = buildDefaultDateSeedQuery(
		currentUser?.role?.code,
		resolvedSearchParams
	)
	if (seedQuery) {
		redirect(`/dashboard/negocios?${seedQuery}`)
	}

	return (
		<DashboardLayout currentPage="Negocio">
			<Suspense fallback={<NegociosPageSkeleton />}>
				<NegociosPageData
					currentUser={currentUser}
					searchParams={resolvedSearchParams}
				/>
			</Suspense>
		</DashboardLayout>
	)
}
