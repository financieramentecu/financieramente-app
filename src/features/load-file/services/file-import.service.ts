import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import type { FileType } from '../lib/file-types'
import { generateSyncFileName } from '../lib/file-naming'
import type { FileImportHistory } from '../types/load-file.types'

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export type FileImportRecord = Awaited<
	ReturnType<typeof prisma.fileImport.create>
>

export type InitiateImportResult =
	| { created: true; fileImport: FileImportRecord }
	| { created: false; fileImport: FileImportRecord }

// ---------------------------------------------------------------------------
// Error class for period-blocked case
// ---------------------------------------------------------------------------

export class PeriodCompletedError extends Error {
	constructor(
		public readonly month: number,
		public readonly year: number
	) {
		super(`El período ${month}/${year} ya fue liquidado`)
		this.name = 'PeriodCompletedError'
	}
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class FileImportService {
	/**
	 * Dedup + block guard + create.
	 *
	 * 1. If a COMPLETED import exists for fileType+month+year+idUser → throw PeriodCompletedError
	 * 2. If a LOAD import exists for fileType+month+year+idUser → return { created: false, fileImport }
	 * 3. Otherwise → create new FileImport and return { created: true, fileImport }
	 */
	static async initiateImport(params: {
		fileType: FileType
		month: number
		year: number
		idUser: number
	}): Promise<InitiateImportResult> {
		const { fileType, month, year, idUser } = params

		// 1. Check for COMPLETED import (period block guard)
		const completed = await prisma.fileImport.findFirst({
			where: {
				fileType,
				month,
				year,
				idUser,
				status: 'COMPLETED',
			},
		})

		if (completed) {
			throw new PeriodCompletedError(month, year)
		}

		// 2. Check for LOAD import (dedup)
		const existing = await prisma.fileImport.findFirst({
			where: {
				fileType,
				month,
				year,
				idUser,
				status: 'LOAD',
			},
		})

		if (existing) {
			return { created: false, fileImport: existing }
		}

		// 3. Create new import
		const nameFile = generateSyncFileName(fileType, month, year)
		const fileImport = await prisma.fileImport.create({
			data: {
				nameFile,
				fileType,
				month,
				year,
				idUser,
				status: 'PROCESSING',
				totalRecord: 0,
				successRecord: 0,
				errorRecord: 0,
			},
		})

		return { created: true, fileImport }
	}

	/**
	 * List file imports scoped by user or all (admin), with optional server-side filters.
	 * Replaces direct Prisma call in the GET route handler.
	 */
	static async listFileImports(params: {
		userId: number
		isAdmin: boolean
		month?: number
		year?: number
		status?: string
		search?: string
	}): Promise<FileImportHistory[]> {
		const { userId, isAdmin, month, year, status, search } = params

		const where: Prisma.FileImportWhereInput = isAdmin ? {} : { idUser: userId }
		if (month !== undefined) where.month = month
		if (year !== undefined) where.year = year
		if (status && status !== 'ALL') {
			where.status = status
		} else if (!status || status === 'ALL') {
			where.status = { in: ['LOAD', 'COMPLETED'] }
		}
		if (search) where.nameFile = { contains: search, mode: 'insensitive' }

		const fileImports = await prisma.fileImport.findMany({
			where,
			orderBy: { createdAt: 'desc' },
			include: {
				user: {
					select: {
						name: true,
						lastName: true,
					},
				},
			},
		})

		return fileImports as unknown as FileImportHistory[]
	}
}
