import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/nextauth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import type { RespuestaResultadosPreLiquidacion } from '@/features/pre-liquidacion/types/types'

/**
 * GET /api/pre-liquidacion/resultados/[fileId]
 * Obtiene los resultados detallados de una pre-liquidación
 */
export async function GET(
	request: NextRequest,
	props: { params: Promise<{ fileId: string }> }
) {
	const params = await props.params
	try {
		const session = await auth()
		if (!session?.user?.id) {
			return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
		}

		const fileId = parseInt(params.fileId)
		if (isNaN(fileId)) {
			return NextResponse.json(
				{ error: 'ID de archivo inválido' },
				{ status: 400 }
			)
		}

		// Obtener parámetros de query
		const { searchParams } = new URL(request.url)
		const page = parseInt(searchParams.get('page') || '1')
		const pageSize = parseInt(searchParams.get('pageSize') || '100')
		const minComision = searchParams.get('minComision')
		const maxComision = searchParams.get('maxComision')
		const producto = searchParams.get('producto')
		const tipoComision = searchParams.get('tipoComision')

		// Construir filtros (canonical state: PRE-SETTLED)
		const where: Prisma.SettlementCommissionWhereInput = {
			idFileImport: fileId,
			status: 'PRE-SETTLED',
		}

		if (minComision) {
			where.commissionValue = {
				...((where.commissionValue as Prisma.DecimalFilter) || {}),
				gte: parseFloat(minComision),
			}
		}

		if (maxComision) {
			where.commissionValue = {
				...((where.commissionValue as Prisma.DecimalFilter) || {}),
				lte: parseFloat(maxComision),
			}
		}

		if (producto) {
			where.descripcion = {
				contains: producto,
				mode: 'insensitive',
			}
		}

		if (tipoComision) {
			where.descripcion = {
				contains: tipoComision,
				mode: 'insensitive',
			}
		}

		// Contar total de registros
		const totalRegistros = await prisma.settlementCommission.count({ where })

		// Obtener registros paginados
		const registros = await prisma.settlementCommission.findMany({
			where,
			include: {
				business: {
					include: {
						client: true,
						user: true,
					},
				},
				comissionDistributions: {
					include: {
						productPercentageCommissionCategory: {
							include: {
								level: true,
							},
						},
					},
				},
			},
			skip: (page - 1) * pageSize,
			take: pageSize,
			orderBy: {
				createdAt: 'desc',
			},
		})

		// Tipo inferido del resultado de la query
		type RegistroConDistribuciones = (typeof registros)[number]
		type DistributionWithCategory = NonNullable<
			RegistroConDistribuciones['comissionDistributions']
		>[number]

		// Formatear resultados y recolectar categorías únicas
		const categoriasSet = new Set<string>()

		const resultados = registros.map((registro) => {
			const distribuciones: {
				categoria: string
				bruta: number
				neta: number
			}[] = []

			if (
				registro.comissionDistributions &&
				registro.comissionDistributions.length > 0
			) {
				registro.comissionDistributions.forEach(
					(dist: DistributionWithCategory) => {
						const rawCatName =
							dist.productPercentageCommissionCategory?.level?.name ||
							'SIN CATEGORIA'
						const catName = rawCatName.toUpperCase().trim()

						distribuciones.push({
							categoria: catName,
							bruta: dist.valueComission.toNumber(),
							neta: dist.valueComissionFinal.toNumber(),
						})

						categoriasSet.add(catName)
					}
				)
			}

			return {
				idSettlementCommission: registro.idSettlementCommission,
				producto: registro.descripcion,
				rezagado: registro.isLag,
				nombreCliente: registro.business?.client
					? `${registro.business.client.name} ${registro.business.client.lastName || ''}`.trim()
					: null,
				cedulaAgente: registro.business?.user?.identityNumber || null,
				nombreAgente: registro.business?.user
					? `${registro.business.user.name} ${registro.business.user.lastName || ''}`.trim()
					: null,
				numeroContrato: registro.business?.contract || null,
				tipoComision: registro.descripcion,
				comision: registro.commissionValue?.toNumber() || null,
				distribuciones,
				estado: registro.status,
			}
		})

		// Ordenar categorías para consistencia (opcional, pero ayuda al UI)
		const categoriasUnicas = Array.from(categoriasSet).sort()

		const response: RespuestaResultadosPreLiquidacion = {
			resultados,
			paginacion: {
				paginaActual: page,
				totalPaginas: Math.ceil(totalRegistros / pageSize),
				totalRegistros,
				registrosPorPagina: pageSize,
			},
			categoriasUnicas,
		}

		return NextResponse.json(response)
	} catch (error) {
		console.error('Error al obtener resultados:', error)
		return NextResponse.json(
			{
				error: 'Error al obtener resultados',
				details: error instanceof Error ? error.message : 'Error desconocido',
			},
			{ status: 500 }
		)
	}
}
