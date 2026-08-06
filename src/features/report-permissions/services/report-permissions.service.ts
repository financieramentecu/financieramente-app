import { prisma } from '@/lib/prisma'
import { isReportViewBypassRole } from '@/features/report-permissions/lib/report-permissions-helpers'
import type {
	AuthorizedReportsDto,
	CategoryPermissionRow,
	ReportDefinitionDto,
	ReportPermissionMatrix,
	ReportPermissionsCatalog,
} from '@/features/report-permissions/types/report-permissions.types'

function toReportDto(row: {
	id: number
	code: string
	name: string
	description: string | null
	routePath: string
	status: boolean
}): ReportDefinitionDto {
	return {
		id: row.id,
		code: row.code,
		name: row.name,
		description: row.description,
		routePath: row.routePath,
		status: row.status,
	}
}

export async function listReportDefinitions(): Promise<ReportDefinitionDto[]> {
	const rows = await prisma.reportDefinition.findMany({
		where: { status: true },
		orderBy: { name: 'asc' },
	})
	return rows.map(toReportDto)
}

export async function getPermissionMatrix(
	reportCode: string
): Promise<ReportPermissionMatrix | null> {
	const report = await prisma.reportDefinition.findFirst({
		where: { code: reportCode, status: true },
	})
	if (!report) return null

	const [categories, permissions] = await Promise.all([
		prisma.category.findMany({
			where: { status: true },
			orderBy: { name: 'asc' },
			select: { id: true, name: true },
		}),
		prisma.categoryReportPermission.findMany({
			where: { idReport: report.id, status: true },
			select: { idCategory: true },
		}),
	])

	const enabledSet = new Set(permissions.map((p) => p.idCategory))

	const categoryRows: CategoryPermissionRow[] = categories.map((cat) => ({
		idCategory: cat.id,
		name: cat.name,
		enabled: enabledSet.has(cat.id),
	}))

	return {
		report: toReportDto(report),
		categories: categoryRows,
	}
}

export async function getReportPermissionsCatalog(
	reportCode?: string
): Promise<ReportPermissionsCatalog> {
	const reports = await listReportDefinitions()
	const code = reportCode ?? reports[0]?.code
	const matrix = code ? await getPermissionMatrix(code) : null
	return { reports, matrix }
}

/**
 * Replace enablement set for a report:
 * upsert selected categories to status=true;
 * soft-disable previously enabled categories not in selection.
 * Never uses physical delete.
 */
export async function replaceReportPermissions(
	reportCode: string,
	categoryIds: readonly number[]
): Promise<ReportPermissionMatrix> {
	const report = await prisma.reportDefinition.findFirst({
		where: { code: reportCode, status: true },
	})
	if (!report) {
		throw new ReportPermissionsNotFoundError(reportCode)
	}

	const uniqueCategoryIds = [...new Set(categoryIds)]

	const activeCategories = await prisma.category.findMany({
		where: { id: { in: [...uniqueCategoryIds] }, status: true },
		select: { id: true },
	})
	if (activeCategories.length !== uniqueCategoryIds.length) {
		throw new ReportPermissionsValidationError(
			'Una o más categorías no existen o están inactivas'
		)
	}

	const existing = await prisma.categoryReportPermission.findMany({
		where: { idReport: report.id },
	})

	const selectedSet = new Set(uniqueCategoryIds)

	await prisma.$transaction(async (tx) => {
		for (const idCategory of uniqueCategoryIds) {
			await tx.categoryReportPermission.upsert({
				where: {
					idReport_idCategory: {
						idReport: report.id,
						idCategory,
					},
				},
				create: {
					idReport: report.id,
					idCategory,
					status: true,
				},
				update: {
					status: true,
				},
			})
		}

		for (const row of existing) {
			if (!selectedSet.has(row.idCategory) && row.status) {
				await tx.categoryReportPermission.update({
					where: { id: row.id },
					data: { status: false },
				})
			}
		}
	})

	const matrix = await getPermissionMatrix(reportCode)
	if (!matrix) {
		throw new ReportPermissionsNotFoundError(reportCode)
	}
	return matrix
}

export interface ReportAccessUser {
	readonly roleCode: string | null | undefined
	readonly idCategory: number | null | undefined
}

/**
 * Server-side authorization: ADMIN bypass, else active category permission only.
 */
export async function canViewReport(
	user: ReportAccessUser,
	reportCode: string
): Promise<boolean> {
	if (isReportViewBypassRole(user.roleCode)) {
		return true
	}
	if (!user.idCategory) {
		return false
	}

	const permission = await prisma.categoryReportPermission.findFirst({
		where: {
			status: true,
			idCategory: user.idCategory,
			report: {
				code: reportCode,
				status: true,
			},
		},
		select: { id: true },
	})
	return permission !== null
}

export async function getAuthorizedReportCodes(
	user: ReportAccessUser
): Promise<AuthorizedReportsDto> {
	if (isReportViewBypassRole(user.roleCode)) {
		const reports = await prisma.reportDefinition.findMany({
			where: { status: true },
			select: { code: true },
			orderBy: { name: 'asc' },
		})
		return { codes: reports.map((r) => r.code) }
	}

	if (!user.idCategory) {
		return { codes: [] }
	}

	const permissions = await prisma.categoryReportPermission.findMany({
		where: {
			status: true,
			idCategory: user.idCategory,
			report: { status: true },
		},
		select: {
			report: { select: { code: true } },
		},
	})

	return { codes: permissions.map((p) => p.report.code) }
}

export class ReportPermissionsNotFoundError extends Error {
	constructor(code: string) {
		super(`Reporte no encontrado: ${code}`)
		this.name = 'ReportPermissionsNotFoundError'
	}
}

export class ReportPermissionsValidationError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'ReportPermissionsValidationError'
	}
}
