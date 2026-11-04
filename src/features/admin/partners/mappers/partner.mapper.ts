import { derivePartnerStatus } from '../lib/partner-status'
import type { PartnerDto } from '../types/partner.types'

/** Prisma row shape selected by `PARTNER_SELECT` in the service. */
export interface PartnerRow {
	idUser: number
	name: string
	lastName: string | null
	typeIdentity: string
	identityNumber: string | null
	email: string
	phone: string | null
	active: boolean
	activatedAt: Date | null
	createdAt: Date
	leader: {
		idUser: number
		name: string
		lastName: string | null
		email: string
		level?: { code: string } | null
	} | null
}

export function toPartnerDto(row: PartnerRow): PartnerDto {
	return {
		id: row.idUser,
		name: row.name,
		lastName: row.lastName,
		typeIdentity: row.typeIdentity,
		identityNumber: row.identityNumber,
		email: row.email,
		phone: row.phone,
		active: row.active,
		activatedAt: row.activatedAt ? row.activatedAt.toISOString() : null,
		createdAt: row.createdAt.toISOString(),
		status: derivePartnerStatus(row),
		leader: row.leader
			? {
					id: row.leader.idUser,
					name: row.leader.name,
					lastName: row.leader.lastName,
					email: row.leader.email,
					levelCode: row.leader.level?.code ?? null,
				}
			: null,
	}
}
