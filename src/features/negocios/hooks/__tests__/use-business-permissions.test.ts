import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useBusinessPermissions } from '@/features/negocios/hooks/use-business-permissions'
import type { UserWithRole } from '@/features/negocios/types/business.types'

function userWithRole(code: string): UserWithRole {
	return {
		idUser: 1,
		name: 'Test',
		lastName: 'User',
		email: 'test@financieramentecu.com',
		role: {
			idRole: 1,
			name: code,
			code,
		},
	}
}

const CLIENT_FIELDS = [
	'identityNumber',
	'email',
	'name',
	'lastNames',
	'phone',
	'clientOrigin',
] as const

describe('useBusinessPermissions — COM-63 client fields', () => {
	it('permite editar información del cliente al Asistente Operativo de Gerencia', () => {
		const { result } = renderHook(() =>
			useBusinessPermissions({
				mode: 'edit',
				currentUser: userWithRole('ASISTENTE_GERENCIA_OPERATIVA'),
				businessStatus: 'EMITIDO',
			})
		)

		for (const field of CLIENT_FIELDS) {
			expect(result.current.getFieldPermission(field)).toEqual({
				readonly: false,
				disabled: false,
				hidden: false,
			})
		}
		expect(result.current.canEditClientInfo).toBe(true)
	})

	it('permite editar información del cliente al Admin', () => {
		const { result } = renderHook(() =>
			useBusinessPermissions({
				mode: 'edit',
				currentUser: userWithRole('ADMIN'),
				businessStatus: 'VENTA_EFECTUADA',
			})
		)

		for (const field of CLIENT_FIELDS) {
			expect(result.current.getFieldPermission(field).disabled).toBe(false)
		}
	})

	it('mantiene bloqueada la información del cliente para Agente', () => {
		const { result } = renderHook(() =>
			useBusinessPermissions({
				mode: 'edit',
				currentUser: userWithRole('AGENTE'),
				businessStatus: 'EMITIDO',
			})
		)

		for (const field of CLIENT_FIELDS) {
			expect(result.current.getFieldPermission(field)).toEqual({
				readonly: true,
				disabled: true,
				hidden: false,
			})
		}
		expect(result.current.canEditClientInfo).toBe(false)
	})

	it('permite editar campos financieros de un negocio FONDEADO al Admin', () => {
		const { result } = renderHook(() =>
			useBusinessPermissions({
				mode: 'edit',
				currentUser: userWithRole('ADMIN'),
				businessStatus: 'FONDEADO',
			})
		)

		for (const field of ['currency', 'value'] as const) {
			expect(result.current.getFieldPermission(field)).toEqual({
				readonly: false,
				disabled: false,
				hidden: false,
			})
		}
		for (const field of ['company', 'producto', 'terms', 'periodicity'] as const) {
			expect(result.current.getFieldPermission(field)).toEqual({
				readonly: true,
				disabled: true,
				hidden: false,
			})
		}
	})

	it('permite editar campos financieros de un negocio FONDEADO al Asistente Operativo', () => {
		const { result } = renderHook(() =>
			useBusinessPermissions({
				mode: 'edit',
				currentUser: userWithRole('ASISTENTE_GERENCIA_OPERATIVA'),
				businessStatus: 'FONDEADO',
			})
		)

		expect(result.current.getFieldPermission('value').disabled).toBe(false)
		expect(result.current.getFieldPermission('terms').disabled).toBe(true)
		expect(result.current.getFieldPermission('periodicity').disabled).toBe(true)
		expect(result.current.getFieldPermission('contract').disabled).toBe(false)
		for (const field of CLIENT_FIELDS) {
			expect(result.current.getFieldPermission(field).disabled).toBe(false)
		}
	})

	it('mantiene bloqueados los campos financieros de un negocio FONDEADO para Agente', () => {
		const { result } = renderHook(() =>
			useBusinessPermissions({
				mode: 'edit',
				currentUser: userWithRole('AGENTE'),
				businessStatus: 'FONDEADO',
			})
		)

		expect(result.current.getFieldPermission('value')).toEqual({
			readonly: true,
			disabled: true,
			hidden: false,
		})
		expect(result.current.getFieldPermission('agent')).toEqual({
			readonly: true,
			disabled: true,
			hidden: false,
		})
	})

	it('permite al Analista de Soporte editar el valor en cualquier estado operativo', () => {
		for (const businessStatus of ['VENTA_EFECTUADA', 'EMITIDO', 'FONDEADO']) {
			const { result } = renderHook(() =>
				useBusinessPermissions({
					mode: 'edit',
					currentUser: userWithRole('ANALISTA_SOPORTE'),
					businessStatus,
				})
			)

			expect(result.current.getFieldPermission('value')).toEqual({
				readonly: false,
				disabled: false,
				hidden: false,
			})
		}
	})

	it('mantiene bloqueados plazo y periodicidad de un negocio FONDEADO para el Analista de Soporte', () => {
		const { result } = renderHook(() =>
			useBusinessPermissions({
				mode: 'edit',
				currentUser: userWithRole('ANALISTA_SOPORTE'),
				businessStatus: 'FONDEADO',
			})
		)

		expect(result.current.getFieldPermission('terms').disabled).toBe(true)
		expect(result.current.getFieldPermission('periodicity').disabled).toBe(true)
		expect(result.current.getFieldPermission('value').disabled).toBe(false)
	})

	it('mantiene bloqueada la información del cliente para Analista de Soporte', () => {
		const { result } = renderHook(() =>
			useBusinessPermissions({
				mode: 'edit',
				currentUser: userWithRole('ANALISTA_SOPORTE'),
				businessStatus: 'EMITIDO',
			})
		)

		for (const field of CLIENT_FIELDS) {
			expect(result.current.getFieldPermission(field).disabled).toBe(true)
		}
	})
})
