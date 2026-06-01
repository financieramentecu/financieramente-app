import { Suspense } from 'react'
import { SimuladorClient } from '@/features/simulador/components/simulador-client'
import { auth } from '@/auth'
import { UserRole } from '@/features/auth/lib/roles'
import { prisma } from '@/lib/prisma'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'

export const metadata = {
	title: 'Calculadora Comisional',
	description: 'Calcula y simula la distribución de comisiones',
}

export default async function SimuladorPage() {
	const session = await auth()
	const userIdStr = (session?.user as { idUser?: number })?.idUser || session?.user?.id
	const userRole = session?.user?.role
	const idUser = parseInt(userIdStr?.toString() || '0', 10)

	const currentUser = await prisma.user.findUnique({
		where: { idUser },
		select: { idLevel: true }
	})

	// Obtener datos iniciales para los selects
	const [companies, products, origins, allLevels] = await Promise.all([
		prisma.company.findMany({
			where: { status: true },
			select: { 
				idCompany: true, 
				name: true,
				currency: { select: { symbol: true } }
			},
			orderBy: { name: 'asc' },
		}),
		prisma.product.findMany({
			where: { status: true },
			select: { idProduct: true, name: true, idCompany: true },
			orderBy: { name: 'asc' },
		}),
		prisma.clientOrigin.findMany({
			where: { status: true },
			select: { idClientOrigin: true, name: true },
			orderBy: { name: 'asc' },
		}),
		prisma.level.findMany({
			where: { status: true },
			select: { idLevel: true, name: true, idNextLevel: true, code: true },
			orderBy: { idLevel: 'asc' },
		})
	])

	// Filtrar niveles permitidos (hacia abajo) si no es ADMIN
	let allowedLevels = allLevels
	if (userRole !== UserRole.ADMIN && currentUser?.idLevel) {
		const allowedIds = new Set<number>()
		
		// Encontrar niveles que están debajo del usuario
		// El nivel del usuario está permitido
		allowedIds.add(currentUser.idLevel)

		// Buscar recursivamente los niveles cuyo `idNextLevel` apunta a un nivel permitido
		let addedNew = true
		while (addedNew) {
			addedNew = false
			for (const lvl of allLevels) {
				if (!allowedIds.has(lvl.idLevel) && lvl.idNextLevel && allowedIds.has(lvl.idNextLevel)) {
					allowedIds.add(lvl.idLevel)
					addedNew = true
				}
			}
		}

		allowedLevels = allLevels.filter(l => allowedIds.has(l.idLevel))
	}

	// Ordenar allowedLevels por el número del código de nivel (LEVEL_0, LEVEL_1, etc.)
	allowedLevels.sort((a, b) => {
		const numA = parseInt(a.code.replace('LEVEL_', ''), 10) || 0
		const numB = parseInt(b.code.replace('LEVEL_', ''), 10) || 0
		return numA - numB
	})

	return (
		<DashboardLayout currentPage="Calculadora">
			<div className="container mx-auto py-8 max-w-7xl">
				<div className="mb-8">
					<h1 className="text-3xl font-bold tracking-tight">Calculadora</h1>
					<p className="text-muted-foreground">
						Simula la distribución de comisiones para proyectar tus ganancias
					</p>
				</div>
				<Suspense fallback={<div>Cargando simulador...</div>}>
					<SimuladorClient
						companies={companies}
						products={products}
						origins={origins}
						levels={allowedLevels}
						userRole={userRole as UserRole}
						userLevelId={currentUser?.idLevel || null}
					/>
				</Suspense>
			</div>
		</DashboardLayout>
	)
}
