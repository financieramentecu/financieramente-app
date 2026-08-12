import { describe, expect, it } from 'vitest'
import { buildBreadcrumbsFromPathname } from '@/lib/navigation/breadcrumb-utils'

describe('buildBreadcrumbsFromPathname', () => {
	it('decodes percent-encoded segments for labels and builds valid hrefs', () => {
		const path =
			'/dashboard/config-distribucion-comisiones/C%2BS-PROPIO-JUNIOR/reglas'
		const crumbs = buildBreadcrumbsFromPathname(path)

		// 'dashboard' is filtered out — only 3 visible items
		expect(crumbs).toHaveLength(3)
		expect(crumbs[0]).toEqual({
			label: 'Config. distribución de comisiones',
			href: '/dashboard/config-distribucion-comisiones',
		})
		expect(crumbs[1]).toEqual({
			label: 'C+S-PROPIO-JUNIOR',
			href: '/dashboard/config-distribucion-comisiones/C%2BS-PROPIO-JUNIOR',
		})
		expect(crumbs[2]).toEqual({
			label: 'Reglas',
			href: undefined,
		})
	})

	it('handles already-decoded path segments', () => {
		const path =
			'/dashboard/config-distribucion-comisiones/C+S-PROPIO-JUNIOR/reglas'
		const crumbs = buildBreadcrumbsFromPathname(path)

		// 'dashboard' filtered out → crumbs[0] = config, crumbs[1] = C+S-PROPIO-JUNIOR
		expect(crumbs[1]?.label).toBe('C+S-PROPIO-JUNIOR')
		expect(crumbs[1]?.href).toBe(
			'/dashboard/config-distribucion-comisiones/C%2BS-PROPIO-JUNIOR'
		)
	})

	it('uses Spanish labels for report permissions and Producción Real', () => {
		expect(
			buildBreadcrumbsFromPathname('/dashboard/admin/report-permissions')
		).toEqual([
			{ label: 'Administración', href: '/dashboard/admin' },
			{ label: 'Permisos de Reportes', href: undefined },
		])

		expect(
			buildBreadcrumbsFromPathname('/dashboard/reportes/produccion-real')
		).toEqual([
			{ label: 'Reportes', href: '/dashboard/reportes' },
			{ label: 'Producción Real', href: undefined },
		])
	})
})
