import { describe, expect, it } from 'vitest'
import {
	planClientDocumentTypeMigration,
	type CatalogDocumentTypeRef,
} from '@/features/negocios/lib/plan-client-document-type-migration'

const catalog: CatalogDocumentTypeRef[] = [
	{ idDocumentType: 1, code: 'CC' },
	{ idDocumentType: 4, code: 'NIT' },
	{ idDocumentType: 8, code: 'ce' },
]

describe('planClientDocumentTypeMigration', () => {
	it('assigns CC only to clients without a type and keeps an existing match', () => {
		const plan = planClientDocumentTypeMigration(
			[
				{ idClient: 1, idDocumentType: null, typeIdentity: 'NIT' },
				{ idClient: 2, idDocumentType: null, typeIdentity: '' },
				{ idClient: 3, idDocumentType: null, typeIdentity: 'XX' },
				{ idClient: 4, idDocumentType: 8, typeIdentity: 'CE' },
				{ idClient: 5, idDocumentType: null, typeIdentity: 'ce' },
			],
			catalog
		)

		expect(plan.found).toBe(4)
		expect(plan.skipped).toBe(1)
		expect(plan.preserved).toBe(2)
		expect(plan.defaultedToCitizenshipCard).toBe(2)
		expect(plan.migrated).toBe(4)
		expect(plan.errors).toEqual([])
		expect(plan.assignments).toEqual([
			{
				idClient: 1,
				idDocumentType: 4,
				typeIdentity: 'NIT',
				reason: 'matched_code',
			},
			{
				idClient: 2,
				idDocumentType: 1,
				typeIdentity: 'CC',
				reason: 'default_cc',
			},
			{
				idClient: 3,
				idDocumentType: 1,
				typeIdentity: 'CC',
				reason: 'default_cc',
			},
			{
				idClient: 5,
				idDocumentType: 8,
				typeIdentity: 'ce',
				reason: 'matched_code',
			},
		])
	})

	it('does not replace a document type that was already assigned', () => {
		const plan = planClientDocumentTypeMigration(
			[{ idClient: 9, idDocumentType: 4, typeIdentity: 'CC' }],
			catalog
		)

		expect(plan).toMatchObject({
			found: 0,
			migrated: 0,
			skipped: 1,
			preserved: 0,
			defaultedToCitizenshipCard: 0,
			assignments: [],
			errors: [],
		})
	})

	it('reports an error when CC is missing and the stored code does not match', () => {
		const plan = planClientDocumentTypeMigration(
			[
				{ idClient: 1, idDocumentType: null, typeIdentity: 'NIT' },
				{ idClient: 2, idDocumentType: null, typeIdentity: null },
			],
			[{ idDocumentType: 4, code: 'NIT' }]
		)

		expect(plan.migrated).toBe(1)
		expect(plan.assignments).toEqual([
			{
				idClient: 1,
				idDocumentType: 4,
				typeIdentity: 'NIT',
				reason: 'matched_code',
			},
		])
		expect(plan.errors).toEqual([
			'Cliente 2: no existe Cédula de Ciudadanía (CC) en el catálogo',
		])
		expect(plan.collisions).toEqual([])
	})

	it('does not assign CC when that number already belongs to another client', () => {
		const plan = planClientDocumentTypeMigration(
			[
				{
					idClient: 1,
					idDocumentType: 1,
					typeIdentity: 'CC',
					identityNumber: '123',
				},
				{
					idClient: 2,
					idDocumentType: null,
					typeIdentity: 'XX',
					identityNumber: '123',
				},
				{
					idClient: 3,
					idDocumentType: null,
					typeIdentity: 'NIT',
					identityNumber: '999',
				},
			],
			catalog
		)

		expect(plan.assignments).toEqual([
			{
				idClient: 3,
				idDocumentType: 4,
				typeIdentity: 'NIT',
				reason: 'matched_code',
			},
		])
		expect(plan.defaultedToCitizenshipCard).toBe(0)
		expect(plan.collisions).toEqual([
			{
				identityNumber: '123',
				nextTypeIdentity: 'CC',
				idClients: [1, 2],
			},
		])
		expect(plan.errors).toEqual([
			'Número 123: quedaría duplicado como CC en los clientes 1, 2',
		])
	})

	it('does not assign CC when two unknown codes share the same number', () => {
		const plan = planClientDocumentTypeMigration(
			[
				{
					idClient: 7,
					idDocumentType: null,
					typeIdentity: 'XX',
					identityNumber: '123',
				},
				{
					idClient: 8,
					idDocumentType: null,
					typeIdentity: 'ZZ',
					identityNumber: '123',
				},
			],
			catalog
		)

		expect(plan.assignments).toEqual([])
		expect(plan.migrated).toBe(0)
		expect(plan.collisions).toEqual([
			{
				identityNumber: '123',
				nextTypeIdentity: 'CC',
				idClients: [7, 8],
			},
		])
	})
})
