import { describe, expect, it } from 'vitest'
import { buildLeadTableCsv, escapeCsvCell } from '@/features/leads/table/build-lead-table-csv'
import type { LeadTableRow } from '@/features/leads/table/lead-table.types'

const row: LeadTableRow = {
	idLead: 1,
	name: 'Ana, "la"',
	lastName: 'Pérez',
	email: 'ana@x.co',
	phone: '+57300',
	originTag: '=HYPERLINK("x")',
	idUser: 5,
	ownerName: 'Luis Gómez',
	idLeadFunnelColumn: 2,
	stageName: 'Contactado',
	outcomeStatus: 'OPEN',
	estimatedValue: '1000000',
	probability: 50,
	weightedValue: '500000',
	tags: [
		{ idLeadTag: 1, name: 'VIP', color: '#f00' },
		{ idLeadTag: 2, name: 'Referido', color: '#0f0' },
	],
	createdAt: '2026-11-01T03:00:00.000Z',
	lastActivityAt: null,
	inactiveDays: null,
}

describe('escapeCsvCell', () => {
	it.each([
		['plain', 'plain'],
		['a,b', '"a,b"'],
		['say "hi"', '"say ""hi"""'],
		['line\nbreak', '"line\nbreak"'],
		['=1+1', "'=1+1"],
		['+57', "'+57"],
		['-2', "'-2"],
		['@cmd', "'@cmd"],
		['\tx', "'\tx"],
	])('%j → %j', (input, expected) => {
		expect(escapeCsvCell(input)).toBe(expected)
	})
})

describe('buildLeadTableCsv', () => {
	it('starts with a BOM and a Spanish header, and writes Bogotá dates', () => {
		const csv = buildLeadTableCsv([row])
		expect(csv.startsWith('﻿')).toBe(true)
		const [header, line] = csv.slice(1).trimEnd().split('\r\n')
		expect(header).toBe(
			'ID,Nombre,Apellido,Correo,Teléfono,Origen,Etapa,Estado,Responsable,Valor estimado,Probabilidad (%),Valor ponderado,Etiquetas,Creado,Última actividad'
		)
		expect(line).toBe(
			`1,"Ana, ""la""",Pérez,ana@x.co,'+57300,"'=HYPERLINK(""x"")",Contactado,Abierto,Luis Gómez,1000000,50,500000,VIP | Referido,2026-10-31,`
		)
	})

	it('writes only the header when there are no rows', () => {
		expect(buildLeadTableCsv([]).split('\r\n').filter(Boolean)).toHaveLength(1)
	})
})
