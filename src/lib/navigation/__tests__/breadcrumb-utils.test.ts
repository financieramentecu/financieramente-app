import { describe, expect, it } from 'vitest'
import { buildBreadcrumbsFromPathname } from '@/lib/navigation/breadcrumb-utils'

describe('buildBreadcrumbsFromPathname', () => {
	it('decodes percent-encoded segments for labels and builds valid hrefs', () => {
		const path =
			'/dashboard/config-distribucion-comisiones/C%2BS-PROPIO-JUNIOR/reglas'
		const crumbs = buildBreadcrumbsFromPathname(path)

		expect(crumbs).toHaveLength(4)
		expect(crumbs[0]).toEqual({ label: 'Inicio', href: '/dashboard' })
		expect(crumbs[1]).toEqual({
			label: 'Config. distribución de comisiones',
			href: '/dashboard/config-distribucion-comisiones',
		})
		expect(crumbs[2]).toEqual({
			label: 'C+S-PROPIO-JUNIOR',
			href: '/dashboard/config-distribucion-comisiones/C%2BS-PROPIO-JUNIOR',
		})
		expect(crumbs[3]).toEqual({
			label: 'Reglas',
			href: undefined,
		})
	})

	it('handles already-decoded path segments', () => {
		const path =
			'/dashboard/config-distribucion-comisiones/C+S-PROPIO-JUNIOR/reglas'
		const crumbs = buildBreadcrumbsFromPathname(path)

		expect(crumbs[2]?.label).toBe('C+S-PROPIO-JUNIOR')
		expect(crumbs[2]?.href).toBe(
			'/dashboard/config-distribucion-comisiones/C%2BS-PROPIO-JUNIOR'
		)
	})
})
