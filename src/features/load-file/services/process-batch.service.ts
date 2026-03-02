import { prisma } from '@/lib/prisma'
import { FILE_TYPES } from '../lib/file-types'
import { ProcessorFactory } from './processors/processor.factory'
import type {
	ProcessBatchRequest,
	ProcessBatchResponse,
} from '../types/load-file.types'

interface AuditContext {
	userId: number
	email?: string
	ipAddress?: string
	userAgent?: string
	fileImportId: number
}

const DEFAULT_DISCOUNT_PERCENTAGE = 0.12
const DEFAULT_CLAWBACK_PERCENTAGE = 0.1

export class ProcessBatchService {
	async processBatch(
		input: ProcessBatchRequest,
		auditContext: AuditContext
	): Promise<ProcessBatchResponse> {
		const { fileImportId, records, headers, fileType, batchSize = 10 } = input

		if (
			!fileImportId ||
			!records ||
			!Array.isArray(records) ||
			records.length === 0
		) {
			throw new Error('Datos inválidos: se requiere fileImportId y records')
		}

		const isValidFileType = Object.values(FILE_TYPES).includes(fileType)
		if (!isValidFileType) {
			throw new Error('Se requiere un tipo de archivo válido')
		}

		const fileImport = await prisma.fileImport.findFirst({
			where: { idFileImport: fileImportId, idUser: auditContext.userId },
		})

		if (!fileImport) {
			throw new Error('FileImport no encontrado o no autorizado')
		}

		const activeConfig = await prisma.commissionConfiguration.findFirst({
			where: { status: 'ACTIVE' },
			orderBy: { createdAt: 'desc' },
		})

		const discountPercentage =
			activeConfig?.discountPercentage != null
				? Number(activeConfig.discountPercentage)
				: DEFAULT_DISCOUNT_PERCENTAGE

		const clawbackPercentage = activeConfig
			? activeConfig.clawbackPercentage == null
				? null
				: Number(activeConfig.clawbackPercentage)
			: DEFAULT_CLAWBACK_PERCENTAGE

		const snapshots = { discountPercentage, clawbackPercentage }
		const processor = ProcessorFactory.getProcessor(fileType)

		let sincronizadoTotal = 0
		let rezagadoTotal = 0
		let noSincronizadoTotal = 0
		let errorTotal = 0
		let recoveredLagsTotal = 0

		for (let i = 0; i < records.length; i += batchSize) {
			const batch = records.slice(i, i + batchSize)
			let sincronizadoBatch = 0
			let rezagadoBatch = 0
			let noSincronizadoBatch = 0
			let errorBatch = 0
			let recoveredLagsBatch = 0

			for (const record of batch) {
				const result = await processor.process(
					record,
					headers,
					fileImportId,
					snapshots,
					auditContext
				)

				if (result.status === 'ERROR') {
					errorBatch++
				} else if (result.status === 'LAG' && !result.idBusiness) {
					noSincronizadoBatch++
				} else if (result.status === 'LAG' && result.idBusiness) {
					rezagadoBatch++
				} else if (result.status === 'SYNCHRONIZED') {
					sincronizadoBatch++
					if (result.recoveredLag) {
						recoveredLagsBatch++
					}
				}
			}

			const updatedFileImport = await prisma.fileImport.update({
				where: { idFileImport: fileImportId },
				data: {
					totalRecord: { increment: batch.length },
					sincronizadoRecord: {
						increment: sincronizadoBatch + recoveredLagsBatch,
					},
					rezagadoRecord: { increment: rezagadoBatch },
					noSincronizadoRecord: { increment: noSincronizadoBatch },
					errorRecord: { increment: errorBatch },
					successRecord: {
						increment: sincronizadoBatch + rezagadoBatch + noSincronizadoBatch,
					},
				},
			})

			const totalProcessed =
				updatedFileImport.successRecord + updatedFileImport.errorRecord
			await prisma.fileImport.update({
				where: { idFileImport: fileImportId },
				data: {
					status:
						updatedFileImport.successRecord === 0 && totalProcessed > 0
							? 'ERROR'
							: 'LOAD',
				},
			})

			sincronizadoTotal += sincronizadoBatch
			rezagadoTotal += rezagadoBatch
			noSincronizadoTotal += noSincronizadoBatch
			errorTotal += errorBatch
			recoveredLagsTotal += recoveredLagsBatch
		}

		return {
			summary: {
				total:
					sincronizadoTotal + rezagadoTotal + noSincronizadoTotal + errorTotal,
				sincronizado: sincronizadoTotal + recoveredLagsTotal,
				rezagado: rezagadoTotal,
				noSincronizado: noSincronizadoTotal,
				error: errorTotal,
			},
		}
	}
}

export const processBatchService = new ProcessBatchService()
