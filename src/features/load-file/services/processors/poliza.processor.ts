import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { FILE_TYPES } from '../../lib/file-types'
import { findBusinessByContract } from '../../lib/business-matcher'
import { rowValidatorService } from '../validators/row.validator.service'
import { AuditAction, logAuditEvent } from '@/features/auth/lib/audit-logger'
import type {
	ICommissionProcessor,
	ProcessorResult,
	ProcessorAuditContext,
} from './processor.interface'
import type { ProcessedRecord } from '../../types/load-file.types'

export class PolizaProcessor implements ICommissionProcessor {
	async process(
		record: ProcessedRecord,
		headers: string[],
		fileImportId: number,
		snapshots: {
			discountPercentage: number | string
			clawbackPercentage: number | string | null
		},
		auditContext: ProcessorAuditContext
	): Promise<ProcessorResult> {
		let extracted: ReturnType<typeof rowValidatorService.validateAndExtractRow>

		try {
			extracted = rowValidatorService.validateAndExtractRow(
				record,
				headers,
				FILE_TYPES.POLIZA
			)
		} catch (error) {
			await this.logAndSaveFormatError(
				record,
				fileImportId,
				auditContext,
				error instanceof Error
					? error.message
					: 'Error de validación de formato'
			)
			return {
				status: 'ERROR',
				isLag: false,
				idBusiness: null,
				recoveredLag: false,
				errorReason: 'Error de validación de formato',
			}
		}

		const business = await findBusinessByContract(extracted.contract)

		return await prisma.$transaction(async (tx) => {
			if (!business) {
				await tx.settlementCommission.create({
					data: {
						idFileImport: fileImportId,
						idBusiness: null,
						contract: extracted.contract,
						descripcion: extracted.descripcion,
						commissionValue: extracted.commission,
						baseCommission: extracted.base,
						discountPercentage: 0,
						clawbackPercentage: 0,
						originCommission: null,
						commissionType: FILE_TYPES.POLIZA,
						status: 'LAG',
						isLag: true,
						isClawback: false,
					},
				})
				return {
					status: 'LAG',
					isLag: true,
					idBusiness: null,
					recoveredLag: false,
				}
			}

			const priorLag = await tx.settlementCommission.findFirst({
				where: {
					contract: extracted.contract,
					commissionType: FILE_TYPES.POLIZA,
					isLag: true,
					status: { in: ['LAG', 'REZAGADO'] },
				},
			})

			const normalizedDesc = (extracted.descripcion || '').toUpperCase()
			let originCommission = null
			let isClawback = false

			if (normalizedDesc.includes('FRONT19')) {
				originCommission = 'CARTERA'
				isClawback = false
			} else if (normalizedDesc.includes('CLAW')) {
				isClawback = true
			} else {
				isClawback = false
			}

			const effectiveDiscount = isClawback ? 0 : snapshots.discountPercentage
			const effectiveClawback =
				isClawback
					? 0
					: snapshots.clawbackPercentage != null
						? Number(snapshots.clawbackPercentage)
						: 0

			if (priorLag) {
				await tx.settlementCommission.update({
					where: { idSettlementCommission: priorLag.idSettlementCommission },
					data: {
						status: 'SYNCHRONIZED',
						isLag: false,
						lagDate: new Date(),
					},
				})
				await this.createSync(
					tx,
					extracted,
					fileImportId,
					business.idBusiness,
					effectiveDiscount,
					effectiveClawback,
					originCommission,
					isClawback
				)
				return {
					status: 'SYNCHRONIZED',
					isLag: false,
					idBusiness: business.idBusiness,
					recoveredLag: true,
				}
			} else {
				await this.createSync(
					tx,
					extracted,
					fileImportId,
					business.idBusiness,
					effectiveDiscount,
					effectiveClawback,
					originCommission,
					isClawback
				)
				return {
					status: 'SYNCHRONIZED',
					isLag: false,
					idBusiness: business.idBusiness,
					recoveredLag: false,
				}
			}
		})
	}

	private async createSync(
		tx: Prisma.TransactionClient,
		extracted: ReturnType<typeof rowValidatorService.validateAndExtractRow>,
		fileImportId: number,
		idBusiness: number,
		discountPercentage: number | string,
		clawbackPercentage: number,
		originCommission: string | null,
		isClawback: boolean
	) {
		await tx.settlementCommission.create({
			data: {
				idFileImport: fileImportId,
				idBusiness,
				contract: extracted.contract,
				descripcion: extracted.descripcion,
				commissionValue: extracted.commission,
				baseCommission: extracted.base,
				discountPercentage,
				clawbackPercentage,
				originCommission,
				commissionType: FILE_TYPES.POLIZA,
				status: 'SYNCHRONIZED',
				isLag: false,
				isClawback,
			},
		})
	}

	private async logAndSaveFormatError(
		record: ProcessedRecord,
		fileImportId: number,
		auditContext: ProcessorAuditContext,
		reason: string
	) {
		await logAuditEvent({
			userId: auditContext.userId,
			email: auditContext.email,
			ipAddress: auditContext.ipAddress,
			userAgent: auditContext.userAgent,
			action: AuditAction.IMPORT_ERROR,
			details: `fileImportId=${fileImportId} row=${record.rowNumber} reason=${reason}`,
		})

		await prisma.fileImportError.create({
			data: {
				idFileImport: fileImportId,
				rowNumber: record.rowNumber,
				contract: null,
				reason,
				rawData: record.data as Prisma.InputJsonValue,
			},
		})
	}
}
