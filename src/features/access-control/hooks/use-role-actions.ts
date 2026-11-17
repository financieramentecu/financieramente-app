'use client'

import { useState } from 'react'
import type { RoleGrants } from '../types/access-control.types'
import { roleApi, type RoleFormInput } from '../lib/role-api'

export type ActionOutcome<T = undefined> =
	| { ok: true; data: T }
	| { ok: false; error: string }

async function attempt<T>(
	fn: () => Promise<T>,
	fallback: string
): Promise<ActionOutcome<T>> {
	try {
		return { ok: true, data: await fn() }
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error && error.message ? error.message : fallback,
		}
	}
}

/** Mutations of roles; `pending` is true while any request is in flight. */
export function useRoleActions() {
	const [pending, setPending] = useState(false)

	async function track<T>(fn: () => Promise<T>, fallback: string) {
		setPending(true)
		try {
			return await attempt(fn, fallback)
		} finally {
			setPending(false)
		}
	}

	return {
		pending,
		create: (input: RoleFormInput) =>
			track(() => roleApi.create(input), 'Error al crear el rol'),
		update: (id: number, input: RoleFormInput) =>
			track(() => roleApi.update(id, input), 'Error al actualizar el rol'),
		deactivate: (id: number) =>
			track(() => roleApi.deactivate(id), 'Error al desactivar el rol'),
		savePermissions: (id: number, grants: RoleGrants) =>
			track(() => roleApi.savePermissions(id, grants), 'Error al guardar los permisos'),
	}
}
