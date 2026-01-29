import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/nextauth'
import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'
import type { Prisma } from '@prisma/client'

// Porcentaje de descuento por defecto (10%)
const DESCUENTO_POR_DEFECTO = new Decimal(0.1)

/**
 * GET /api/pre-liquidacion/detalle/[fileId]
 * Obtiene el detalle de registros sincronizados y rezagados para un archivo
 * con cálculos de distribución por posición
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

		// Obtener información del archivo
		const fileImport = await prisma.fileImport.findUnique({
			where: { idFileImport: fileId },
			include: {
				user: {
					select: {
						name: true,
						lastName: true,
					},
				},
			},
		})

		if (!fileImport) {
			return NextResponse.json(
				{ error: 'Archivo no encontrado' },
				{ status: 404 }
			)
		}

		// Obtener registros sincronizados y rezagados
		const registros = await prisma.settlementCommission.findMany({
			where: {
				idFileImport: fileId,
				status: {
					in: ['SINCRONIZADO', 'LAG'],
				},
			},
			include: {
				business: {
					include: {
						client: true,
						user: {
							select: {
								idUser: true,
								name: true,
								lastName: true,
								identityNumber: true,
							},
						},
						productPercentajeCommision: {
							include: {
								productPercentajeCommisionCategories: {
									include: {
										category: true,
									},
									where: {
										active: true,
									},
								},
							},
						},
					},
				},
			},
			orderBy: {
				createdAt: 'asc',
			},
		})

		// Interface para distribución por agente
		interface AgenteDistribucion {
			idAgente: number
			nombreAgente: string
			cedulaAgente: string
			totalComision: number
			totalGeneral: number
			totalAgencia: number
			totalLider: number
			totalCoach: number
			cantidadRegistros: number
			sincronizados: number
			rezagados: number
		}

		// Calcular distribución por agente
		const distribucionMap = new Map<string, AgenteDistribucion>()

		// Formatear registros con cálculos
		const registrosFormateados = registros.map((r) => {
			const comisionBase = r.valorComision || new Decimal(0)

			// Obtener porcentajes de comisión por posición
			let porcentajeGeneral = new Decimal(1) // 100% por defecto
			let porcentajeAgencia = new Decimal(0)
			let porcentajeLider = new Decimal(0)
			let porcentajeCoach = new Decimal(0)

			if (
				r.business?.productPercentajeCommision
					?.productPercentajeCommisionCategories
			) {
				r.business.productPercentajeCommision.productPercentajeCommisionCategories.forEach(
					(
						cat: Prisma.ProductPercentajeCommisionCategoryGetPayload<{
							include: { category: true }
						}>
					) => {
						const categoryName = cat.category.name.toUpperCase()
						if (categoryName.includes('GENERAL')) {
							porcentajeGeneral = cat.porcentajeDistribucion
						} else if (categoryName.includes('AGENCIA')) {
							porcentajeAgencia = cat.porcentajeDistribucion
						} else if (
							categoryName.includes('LIDER') ||
							categoryName.includes('LÍDER')
						) {
							porcentajeLider = cat.porcentajeDistribucion
						} else if (categoryName.includes('COACH')) {
							porcentajeCoach = cat.porcentajeDistribucion
						}
					}
				)
			}

			// Calcular liquidaciones brutas
			const generalBruta = comisionBase.mul(porcentajeGeneral)
			const agenciaBruta = comisionBase.mul(porcentajeAgencia)
			const liderBruta = comisionBase.mul(porcentajeLider)
			const coachBruta = comisionBase.mul(porcentajeCoach)

			// Calcular liquidaciones con descuento
			const generalDescuento = generalBruta.sub(
				generalBruta.mul(DESCUENTO_POR_DEFECTO)
			)
			const agenciaDescuento = agenciaBruta.sub(
				agenciaBruta.mul(DESCUENTO_POR_DEFECTO)
			)
			const liderDescuento = liderBruta.sub(
				liderBruta.mul(DESCUENTO_POR_DEFECTO)
			)
			const coachDescuento = coachBruta.sub(
				coachBruta.mul(DESCUENTO_POR_DEFECTO)
			)

			// Actualizar distribución por agente
			if (r.business?.user) {
				const agenteKey = `${r.business.user.idUser}`

				if (!distribucionMap.has(agenteKey)) {
					distribucionMap.set(agenteKey, {
						idAgente: r.business.user.idUser,
						nombreAgente:
							`${r.business.user.name} ${r.business.user.lastName || ''}`.trim(),
						cedulaAgente: r.business.user.identityNumber || '',
						totalComision: 0,
						totalGeneral: 0,
						totalAgencia: 0,
						totalLider: 0,
						totalCoach: 0,
						cantidadRegistros: 0,
						sincronizados: 0,
						rezagados: 0,
					})
				}

				const agente = distribucionMap.get(agenteKey)!
				agente.totalComision += comisionBase.toNumber()
				agente.totalGeneral += generalDescuento.toNumber()
				agente.totalAgencia += agenciaDescuento.toNumber()
				agente.totalLider += liderDescuento.toNumber()
				agente.totalCoach += coachDescuento.toNumber()
				agente.cantidadRegistros += 1

				if (r.status === 'SINCRONIZADO') {
					agente.sincronizados += 1
				} else if (r.status === 'LAG') {
					agente.rezagados += 1
				}
			}

			return {
				idSettlementCommission: r.idSettlementCommission,
				idBusiness: r.idBusiness,
				producto: r.producto,
				esRezagado: r.isLag || r.status === 'LAG',
				nombreCliente: r.business?.client
					? `${r.business.client.name} ${r.business.client.lastName || ''}`.trim()
					: null,
				cedulaAgente: r.business?.user?.identityNumber || '',
				nombreAgente: r.business?.user
					? `${r.business.user.name} ${r.business.user.lastName || ''}`.trim()
					: '',
				numeroContrato: r.business?.contract || r.poliza || null,
				tipoComision: r.concepto,
				comision: comisionBase.toNumber(),
				// Cálculos de distribución
				generalBruta: generalBruta.toNumber(),
				generalDescuento: generalDescuento.toNumber(),
				agenciaBruta: agenciaBruta.toNumber(),
				agenciaDescuento: agenciaDescuento.toNumber(),
				liderBruta: liderBruta.toNumber(),
				liderDescuento: liderDescuento.toNumber(),
				coachBruta: coachBruta.toNumber(),
				coachDescuento: coachDescuento.toNumber(),
				estado: r.status,
			}
		})

		const response = {
			archivo: {
				idFileImport: fileImport.idFileImport,
				nombreArchivo: fileImport.nameFile,
				usuarioCargo:
					`${fileImport.user.name} ${fileImport.user.lastName || ''}`.trim(),
				fechaCarga: fileImport.loadDate.toISOString().split('T')[0],
				totalRegistros: fileImport.totalRecord,
				sincronizados: fileImport.sincronizadoRecord,
				rezagados: fileImport.rezagadoRecord,
			},
			registros: registrosFormateados,
			distribucion: Array.from(distribucionMap.values()),
			resumen: {
				totalRegistros: registros.length,
				sincronizados: registros.filter((r) => r.status === 'SINCRONIZADO')
					.length,
				rezagados: registros.filter((r) => r.status === 'LAG').length,
				totalComision: registrosFormateados.reduce(
					(sum, r) => sum + r.comision,
					0
				),
				totalGeneral: registrosFormateados.reduce(
					(sum, r) => sum + r.generalDescuento,
					0
				),
				totalAgencia: registrosFormateados.reduce(
					(sum, r) => sum + r.agenciaDescuento,
					0
				),
				totalLider: registrosFormateados.reduce(
					(sum, r) => sum + r.liderDescuento,
					0
				),
				totalCoach: registrosFormateados.reduce(
					(sum, r) => sum + r.coachDescuento,
					0
				),
			},
		}

		return NextResponse.json(response)
	} catch (error) {
		console.error('Error al obtener detalle:', error)
		return NextResponse.json(
			{
				error: 'Error al obtener detalle',
				details: error instanceof Error ? error.message : 'Error desconocido',
			},
			{ status: 500 }
		)
	}
}
