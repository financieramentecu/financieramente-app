import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
	FileImportService,
	PeriodCompletedError,
	PeriodPreSettledError,
} from '../services/file-import.service'
import { prisma } from '@/lib/prisma'
import { FILE_TYPES } from '../lib/file-types'

vi.mock('@/lib/prisma', () => ({
	prisma: {
		fileImport: {
			findFirst: vi.fn(),
			create: vi.fn(),
			findMany: vi.fn(),
		},
	},
}))

const mockFileImportLoad = {
	idFileImport: 1,
	nameFile: 'SINCRONIZACION-POLIZA-FEBRERO-2026',
	fileType: 'POLIZA',
	month: 2,
	year: 2026,
	idUser: 10,
	status: 'LOAD',
	totalRecord: 0,
	successRecord: 0,
	errorRecord: 0,
	sincronizadoRecord: 0,
	rezagadoRecord: 0,
	noSincronizadoRecord: 0,
	createdAt: new Date(),
	user: { name: 'John', lastName: 'Doe' },
}

const mockFileImportCompleted = {
	...mockFileImportLoad,
	idFileImport: 2,
	status: 'COMPLETED',
}

const mockFileImportPreSettled = {
	...mockFileImportLoad,
	idFileImport: 4,
	status: 'PRE-SETTLED',
}

describe('FileImportService', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('initiateImport', () => {
		describe('when a COMPLETED import exists for the same period + user', () => {
			it('throws PeriodCompletedError', async () => {
				vi.mocked(prisma.fileImport.findFirst).mockResolvedValueOnce(
					mockFileImportCompleted as never
				)

				await expect(
					FileImportService.initiateImport({
						fileType: FILE_TYPES.POLIZA,
						month: 2,
						year: 2026,
						idUser: 10,
					})
				).rejects.toThrow(PeriodCompletedError)
			})

			it('throws PeriodCompletedError with the correct month and year', async () => {
				vi.mocked(prisma.fileImport.findFirst).mockResolvedValueOnce(
					mockFileImportCompleted as never
				)

				await expect(
					FileImportService.initiateImport({
						fileType: FILE_TYPES.POLIZA,
						month: 2,
						year: 2026,
						idUser: 10,
					})
				).rejects.toThrow('El período 2/2026 ya fue liquidado')
			})

			it('does NOT call prisma.fileImport.create', async () => {
				vi.mocked(prisma.fileImport.findFirst).mockResolvedValueOnce(
					mockFileImportCompleted as never
				)

				await expect(
					FileImportService.initiateImport({
						fileType: FILE_TYPES.POLIZA,
						month: 2,
						year: 2026,
						idUser: 10,
					})
				).rejects.toThrow(PeriodCompletedError)

				expect(prisma.fileImport.create).not.toHaveBeenCalled()
			})
		})

		describe('when a PRE-SETTLED import exists for the same period + user', () => {
			it('throws PeriodPreSettledError', async () => {
				vi.mocked(prisma.fileImport.findFirst).mockResolvedValueOnce(
					mockFileImportPreSettled as never
				)

				await expect(
					FileImportService.initiateImport({
						fileType: FILE_TYPES.POLIZA,
						month: 2,
						year: 2026,
						idUser: 10,
					})
				).rejects.toThrow(PeriodPreSettledError)
			})
		})

		describe('when a LOAD import exists for the same period + user (dedup)', () => {
			it('returns { created: false, fileImport: existing }', async () => {
				// First call (COMPLETED check) → null, second call (LOAD check) → existing
				vi.mocked(prisma.fileImport.findFirst)
					.mockResolvedValueOnce(null)
					.mockResolvedValueOnce(mockFileImportLoad as never)

				const result = await FileImportService.initiateImport({
					fileType: FILE_TYPES.POLIZA,
					month: 2,
					year: 2026,
					idUser: 10,
				})

				expect(result.created).toBe(false)
				expect(result.fileImport).toEqual(mockFileImportLoad)
			})

			it('does NOT call prisma.fileImport.create', async () => {
				vi.mocked(prisma.fileImport.findFirst)
					.mockResolvedValueOnce(null)
					.mockResolvedValueOnce(mockFileImportLoad as never)

				await FileImportService.initiateImport({
					fileType: FILE_TYPES.POLIZA,
					month: 2,
					year: 2026,
					idUser: 10,
				})

				expect(prisma.fileImport.create).not.toHaveBeenCalled()
			})
		})

		describe('when no existing import for the period + user', () => {
			it('creates a new FileImport and returns { created: true, fileImport }', async () => {
				const newFileImport = {
					...mockFileImportLoad,
					idFileImport: 3,
					status: 'PROCESSING',
				}

				vi.mocked(prisma.fileImport.findFirst)
					.mockResolvedValueOnce(null)
					.mockResolvedValueOnce(null)
				vi.mocked(prisma.fileImport.create).mockResolvedValueOnce(
					newFileImport as never
				)

				const result = await FileImportService.initiateImport({
					fileType: FILE_TYPES.POLIZA,
					month: 2,
					year: 2026,
					idUser: 10,
				})

				expect(result.created).toBe(true)
				expect(result.fileImport).toEqual(newFileImport)
			})

			it('calls prisma.fileImport.create with correct data', async () => {
				const newFileImport = { ...mockFileImportLoad, idFileImport: 3 }

				vi.mocked(prisma.fileImport.findFirst)
					.mockResolvedValueOnce(null)
					.mockResolvedValueOnce(null)
				vi.mocked(prisma.fileImport.create).mockResolvedValueOnce(
					newFileImport as never
				)

				await FileImportService.initiateImport({
					fileType: FILE_TYPES.POLIZA,
					month: 2,
					year: 2026,
					idUser: 10,
				})

				expect(prisma.fileImport.create).toHaveBeenCalledWith({
					data: {
						nameFile: 'SINCRONIZACION-POLIZA-FEBRERO-2026',
						fileType: FILE_TYPES.POLIZA,
						month: 2,
						year: 2026,
						idUser: 10,
						status: 'PROCESSING',
						totalRecord: 0,
						successRecord: 0,
						errorRecord: 0,
					},
				})
			})
		})

		describe('dedup does NOT trigger for a different idUser', () => {
			it('creates a new FileImport for a different user even when LOAD import exists for another user', async () => {
				const newFileImportUser20 = {
					...mockFileImportLoad,
					idFileImport: 5,
					idUser: 20,
				}

				// Both COMPLETED and LOAD checks return null for idUser=20
				vi.mocked(prisma.fileImport.findFirst)
					.mockResolvedValueOnce(null)
					.mockResolvedValueOnce(null)
				vi.mocked(prisma.fileImport.create).mockResolvedValueOnce(
					newFileImportUser20 as never
				)

				const result = await FileImportService.initiateImport({
					fileType: FILE_TYPES.POLIZA,
					month: 2,
					year: 2026,
					idUser: 20,
				})

				expect(result.created).toBe(true)
				expect(prisma.fileImport.create).toHaveBeenCalledWith(
					expect.objectContaining({
						data: expect.objectContaining({ idUser: 20 }),
					})
				)
			})
		})
	})

	describe('listFileImports', () => {
		const mockFileImports = [
			mockFileImportLoad,
			{ ...mockFileImportLoad, idFileImport: 2 },
		]

		describe('when isAdmin = true', () => {
			it('returns all file imports (no user filter)', async () => {
				vi.mocked(prisma.fileImport.findMany).mockResolvedValueOnce(
					mockFileImports as never
				)

				const result = await FileImportService.listFileImports({
					userId: 10,
					isAdmin: true,
				})

				expect(result).toEqual(mockFileImports)
				expect(prisma.fileImport.findMany).toHaveBeenCalledWith(
					expect.objectContaining({
						where: { status: { in: ['LOAD', 'PRE-SETTLED', 'COMPLETED'] } },
					})
				)
			})

			it('admin + no filters → WHERE has default status filter', async () => {
				vi.mocked(prisma.fileImport.findMany).mockResolvedValueOnce(
					mockFileImports as never
				)

				await FileImportService.listFileImports({ userId: 10, isAdmin: true })

				expect(prisma.fileImport.findMany).toHaveBeenCalledWith(
					expect.objectContaining({ where: { status: { in: ['LOAD', 'PRE-SETTLED', 'COMPLETED'] } } })
				)
				expect(prisma.fileImport.findMany).not.toHaveBeenCalledWith(
					expect.objectContaining({ where: expect.objectContaining({ idUser: expect.anything() }) })
				)
			})
		})

		describe('when isAdmin = false', () => {
			it('returns only file imports for the given userId', async () => {
				const userImports = [mockFileImportLoad]
				vi.mocked(prisma.fileImport.findMany).mockResolvedValueOnce(
					userImports as never
				)

				const result = await FileImportService.listFileImports({
					userId: 10,
					isAdmin: false,
				})

				expect(result).toEqual(userImports)
				expect(prisma.fileImport.findMany).toHaveBeenCalledWith(
					expect.objectContaining({
						where: { idUser: 10, status: { in: ['LOAD', 'PRE-SETTLED', 'COMPLETED'] } },
					})
				)
			})
		})

		it('orders by createdAt desc', async () => {
			vi.mocked(prisma.fileImport.findMany).mockResolvedValueOnce(
				mockFileImports as never
			)

			await FileImportService.listFileImports({ userId: 10, isAdmin: true })

			expect(prisma.fileImport.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					orderBy: { createdAt: 'desc' },
				})
			)
		})

		it('includes user name and lastName', async () => {
			vi.mocked(prisma.fileImport.findMany).mockResolvedValueOnce(
				mockFileImports as never
			)

			await FileImportService.listFileImports({ userId: 10, isAdmin: false })

			expect(prisma.fileImport.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					include: {
						user: {
							select: {
								name: true,
								lastName: true,
							},
						},
					},
				})
			)
		})

		describe('server-side filters', () => {
			it('month filter → WHERE includes { month: 3 }', async () => {
				vi.mocked(prisma.fileImport.findMany).mockResolvedValueOnce(
					[] as never
				)

				await FileImportService.listFileImports({
					userId: 1,
					isAdmin: false,
					month: 3,
				})

				expect(prisma.fileImport.findMany).toHaveBeenCalledWith(
					expect.objectContaining({ where: expect.objectContaining({ idUser: 1, month: 3, status: { in: ['LOAD', 'PRE-SETTLED', 'COMPLETED'] } }) })
				)
				expect(prisma.fileImport.findMany).not.toHaveBeenCalledWith(
					expect.objectContaining({ where: expect.objectContaining({ year: expect.anything() }) })
				)
			})

			it('year filter → WHERE includes { year: 2026 }', async () => {
				vi.mocked(prisma.fileImport.findMany).mockResolvedValueOnce(
					[] as never
				)

				await FileImportService.listFileImports({
					userId: 1,
					isAdmin: false,
					year: 2026,
				})

				expect(prisma.fileImport.findMany).toHaveBeenCalledWith(
					expect.objectContaining({ where: expect.objectContaining({ idUser: 1, year: 2026 }) })
				)
				expect(prisma.fileImport.findMany).not.toHaveBeenCalledWith(
					expect.objectContaining({ where: expect.objectContaining({ month: expect.anything() }) })
				)
			})

			it('status filter (not ALL) → WHERE includes { status: "LOAD" }', async () => {
				vi.mocked(prisma.fileImport.findMany).mockResolvedValueOnce(
					[] as never
				)

				await FileImportService.listFileImports({
					userId: 1,
					isAdmin: false,
					status: ['LOAD'],
				})

				expect(prisma.fileImport.findMany).toHaveBeenCalledWith(
					expect.objectContaining({ where: expect.objectContaining({ idUser: 1, status: { in: ['LOAD'] } }) })
				)
			})

			it('status filter LOAD+PRE-SETTLED → WHERE includes { in: ["LOAD","PRE-SETTLED"] } (REQ-6)', async () => {
				vi.mocked(prisma.fileImport.findMany).mockResolvedValueOnce(
					[] as never
				)

				await FileImportService.listFileImports({
					userId: 1,
					isAdmin: false,
					status: ['LOAD', 'PRE-SETTLED'],
				})

				expect(prisma.fileImport.findMany).toHaveBeenCalledWith(
					expect.objectContaining({
						where: expect.objectContaining({
							idUser: 1,
							status: { in: ['LOAD', 'PRE-SETTLED'] },
						}),
					})
				)
			})

			it('status ALL → WHERE includes default status filter', async () => {
				vi.mocked(prisma.fileImport.findMany).mockResolvedValueOnce(
					[] as never
				)

				await FileImportService.listFileImports({
					userId: 1,
					isAdmin: false,
					// status omitted → uses default filter
				})

				expect(prisma.fileImport.findMany).toHaveBeenCalledWith(
					expect.objectContaining({ where: expect.objectContaining({ status: { in: ['LOAD', 'PRE-SETTLED', 'COMPLETED'] } }) })
				)
			})

			it('search → WHERE includes nameFile contains insensitive', async () => {
				vi.mocked(prisma.fileImport.findMany).mockResolvedValueOnce(
					[] as never
				)

				await FileImportService.listFileImports({
					userId: 1,
					isAdmin: false,
					search: 'test',
				})

				expect(prisma.fileImport.findMany).toHaveBeenCalledWith(
					expect.objectContaining({
						where: expect.objectContaining({
							idUser: 1,
							nameFile: { contains: 'test', mode: 'insensitive' },
						}),
					})
				)
			})

			it('no filters → WHERE has { idUser } and default status filter', async () => {
				vi.mocked(prisma.fileImport.findMany).mockResolvedValueOnce(
					[] as never
				)

				await FileImportService.listFileImports({
					userId: 5,
					isAdmin: false,
				})

				expect(prisma.fileImport.findMany).toHaveBeenCalledWith(
					expect.objectContaining({ where: { idUser: 5, status: { in: ['LOAD', 'PRE-SETTLED', 'COMPLETED'] } } })
				)
			})

			it('admin + all filters → WHERE does NOT include idUser', async () => {
				vi.mocked(prisma.fileImport.findMany).mockResolvedValueOnce(
					[] as never
				)

				await FileImportService.listFileImports({
					userId: 1,
					isAdmin: true,
					year: 2026,
					status: ['COMPLETED'],
					search: 'test',
				})

				expect(prisma.fileImport.findMany).toHaveBeenCalledWith(
					expect.objectContaining({
						where: expect.objectContaining({
							year: 2026,
							status: { in: ['COMPLETED'] },
							nameFile: { contains: 'test', mode: 'insensitive' },
						}),
					})
				)
				expect(prisma.fileImport.findMany).not.toHaveBeenCalledWith(
					expect.objectContaining({ where: expect.objectContaining({ idUser: expect.anything() }) })
				)
			})
		})
	})
})
