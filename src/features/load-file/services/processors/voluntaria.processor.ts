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

export class VoluntariaProcessor implements ICommissionProcessor {
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
				FILE_TYPES.VOLUNTARIA
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
						discountPercentage: snapshots.discountPercentage,
						clawbackPercentage: 0,
						originCommission: null,
						commissionType: FILE_TYPES.VOLUNTARIA,
						startDate: extracted.startDate,
						endDate: extracted.endDate,
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

			const priorCommissions = await tx.settlementCommission.findMany({
				where: {
					contract: extracted.contract,
					commissionType: FILE_TYPES.VOLUNTARIA,
				},
			})

			if (priorCommissions.length === 0) {
				const createdAt = business.createdAt
				const isDateMatch =
					createdAt >= extracted.startDate! && createdAt <= extracted.endDate!

				if (isDateMatch) {
					await this.createSync(
						tx,
						extracted,
						fileImportId,
						business.idBusiness,
						snapshots.discountPercentage
					)
					return {
						status: 'SYNCHRONIZED',
						isLag: false,
						idBusiness: business.idBusiness,
						recoveredLag: false,
					}
				} else {
					await this.createLag(tx, extracted, fileImportId, business.idBusiness)
					return {
						status: 'LAG',
						isLag: true,
						idBusiness: business.idBusiness,
						recoveredLag: false,
					}
				}
			} else {
				// Exact match duplicate detection
				const isDuplicate = priorCommissions.some(
					(pc) =>
						pc.startDate?.getTime() === extracted.startDate!.getTime() &&
						pc.endDate?.getTime() === extracted.endDate!.getTime()
				)

				if (isDuplicate) {
					await this.logAndSaveDuplicateError(
						record,
						fileImportId,
						auditContext,
						extracted.contract
					)
					return {
						status: 'ERROR',
						isLag: false,
						idBusiness: business.idBusiness,
						recoveredLag: false,
						errorReason: 'Duplicate commission',
					}
				}

				const existingLag = priorCommissions.find(
					(pc) =>
						pc.isLag === true &&
						(pc.status === 'LAG' || pc.status === 'REZAGADO')
				)

				if (existingLag) {
					await tx.settlementCommission.update({
						where: {
							idSettlementCommission: existingLag.idSettlementCommission,
						},
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
						snapshots.discountPercentage
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
						snapshots.discountPercentage
					)
					return {
						status: 'SYNCHRONIZED',
						isLag: false,
						idBusiness: business.idBusiness,
						recoveredLag: false,
					}
				}
			}
		})
	}

	private async createSync(
		tx: Prisma.TransactionClient,
		extracted: ReturnType<typeof rowValidatorService.validateAndExtractRow>,
		fileImportId: number,
		idBusiness: number,
		discountPercentage: number | string
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
				clawbackPercentage: 0,
				originCommission: null,
				commissionType: FILE_TYPES.VOLUNTARIA,
				startDate: extracted.startDate,
				endDate: extracted.endDate,
				status: 'SYNCHRONIZED',
				isLag: false,
				isClawback: false,
			},
		})
	}

	private async createLag(
		tx: Prisma.TransactionClient,
		extracted: ReturnType<typeof rowValidatorService.validateAndExtractRow>,
		fileImportId: number,
		idBusiness: number
	) {
		await tx.settlementCommission.create({
			data: {
				idFileImport: fileImportId,
				idBusiness,
				contract: extracted.contract,
				descripcion: extracted.descripcion,
				commissionValue: extracted.commission,
				baseCommission: extracted.base,
				discountPercentage: 0,
				clawbackPercentage: 0,
				originCommission: null,
				commissionType: FILE_TYPES.VOLUNTARIA,
				startDate: extracted.startDate,
				endDate: extracted.endDate,
				status: 'LAG',
				isLag: true,
				isClawback: false,
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

	private async logAndSaveDuplicateError(
		record: ProcessedRecord,
		fileImportId: number,
		auditContext: ProcessorAuditContext,
		contract: string
	) {
		await logAuditEvent({
			userId: auditContext.userId,
			email: auditContext.email,
			ipAddress: auditContext.ipAddress,
			userAgent: auditContext.userAgent,
			action: AuditAction.IMPORT_ERROR,
			details: `fileImportId=${fileImportId} row=${record.rowNumber} contract=${contract} reason=Duplicate commission`,
		})

		await prisma.fileImportError.create({
			data: {
				idFileImport: fileImportId,
				rowNumber: record.rowNumber,
				contract,
				reason: 'Duplicate commission',
				rawData: record.data as Prisma.InputJsonValue,
			},
		})
	}
}
