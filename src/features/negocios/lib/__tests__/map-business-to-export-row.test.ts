import { describe, it, expect } from 'vitest'
import {
	negociosExportColumnHeaders,
	mapBusinessToExportRow,
	computeMaxAnnualColumns,
	NEGOCIOS_EXPORT_VALOR_COLUMN,
} from '../map-business-to-export-row'
import { BusinessExportPayload } from '../business-export-include'
import { LeaderExportLevel } from '../resolve-leader-chain-export'
import { Decimal } from '@prisma/client/runtime/library'

describe('mapBusinessToExportRow', () => {
	const mockBusiness = {
		idBusiness: 123,
		contract: 'CONT-001',
		status: 'EMITIDO',
		createdAt: new Date('2024-01-01T10:00:00Z'),
		dateIssued: new Date('2024-02-15T10:00:00Z'),
		dateAnchored: new Date('2024-03-20T10:00:00Z'),
		value: new Decimal(1500000.50),
		term: 12,
		client: {
			name: 'Juan',
			lastName: 'Perez',
			identityNumber: '123456',
			email: 'juan@example.com',
			phone: '+57 300 000 0000'
		},
		user: {
			name: 'Agente',
			lastName: 'Pro',
			category: { name: 'Senior' },
			role: null
		},
		clientOrigin: { name: 'Referido' },
		currency: { name: 'COP' },
		buyPeriodicity: { name: 'Mensual' },
		productPercentageCommission: {
			productConfiguration: {
				product: {
					name: 'Seguro Vida',
					company: { name: 'Compañia A' }
				}
			}
		},
		annualPayments: []
	}

	const mockLeaders: LeaderExportLevel[] = [
		{ fullName: 'Lider Uno', categoryName: 'Director' },
		{ fullName: 'Lider Dos', categoryName: 'Gerente' }
	]

	it('debe tener las cabeceras en el orden y nombres correctos sin filtros de fecha', () => {
		const headers = negociosExportColumnHeaders(1, 0)
		expect(headers[0]).toBe('Agente')
		expect(headers[1]).toBe('Nombres y Apellidos del Cliente')
		expect(headers[2]).toBe('Número de Cédula')
		expect(headers[3]).toBe('Correo Electrónico')
		expect(headers[4]).toBe('Teléfono')
		expect(headers[5]).toBe('Origen del cliente')
		expect(headers[6]).toBe('Compañía')
		expect(headers[7]).toBe('Plazo')
		expect(headers[8]).toBe('Producto')
		expect(headers[9]).toBe('Número de Contrato')
		expect(headers[10]).toBe('Moneda')
		expect(headers[11]).toBe(NEGOCIOS_EXPORT_VALOR_COLUMN)
		expect(headers[12]).toBe('Periodicidad del pago')
		expect(headers[13]).toBe('Líder Encargado')
		expect(headers[14]).toBe('Categoría Líder')
		expect(headers[15]).toBe('Estado de negocio')
		expect(headers[16]).toBe('Fecha de Creación')
		expect(headers[17]).toBe('Fecha de Emisión')
		expect(headers[18]).toBe('Fecha de Fondeo')
		expect(headers).not.toContain('Mes')
		expect(headers).not.toContain('Año')
		expect(headers).not.toContain('Es anualidad')
	})

	it('coloca Líder 2 después de Fecha de Fondeo cuando maxLeaderLevels > 1', () => {
		const headers = negociosExportColumnHeaders(2, 0)
		expect(headers[18]).toBe('Fecha de Fondeo')
		expect(headers[19]).toBe('Líder 2 nombre')
		expect(headers[20]).toBe('Líder 2 categoría')
	})

	it('usa cabeceras Fecha Fondeo Anualidad i al final cuando maxAnnualCols > 0', () => {
		const headers = negociosExportColumnHeaders(1, 2)
		expect(headers[headers.length - 2]).toBe('Fecha Fondeo Anualidad 1')
		expect(headers[headers.length - 1]).toBe('Fecha Fondeo Anualidad 2')
	})

	it('debe tener las cabeceras condicionales si hay filtros de fecha', () => {
		const dateFrom = new Date('2024-01-01T00:00:00Z')
		const dateTo = new Date('2024-01-31T00:00:00Z')
		const headers = negociosExportColumnHeaders(1, 0, dateFrom, dateTo)
		expect(headers[0]).toBe('Fecha inicial fondeo')
		expect(headers[1]).toBe('Fecha final fondeo')
		expect(headers[2]).toBe('Agente')
	})

	it('debe mapear los datos correctamente incluyendo Teléfono', () => {
		const row = mapBusinessToExportRow(mockBusiness as unknown as BusinessExportPayload, mockLeaders, 1, 0)

		expect(row['Agente']).toBe('Agente Pro')
		expect(row['Nombres y Apellidos del Cliente']).toBe('Juan Perez')
		expect(row['Número de Cédula']).toBe('123456')
		expect(row['Teléfono']).toBe('+57 300 000 0000')
		expect(row['Líder Encargado']).toBe('Lider Uno')
		expect(row['Categoría Líder']).toBe('Director')
	})

	it('debe mapear las fechas dinámicas cuando se proveen filtros', () => {
		const dateFrom = new Date('2024-01-01T10:00:00Z')
		const dateTo = new Date('2024-01-31T10:00:00Z')
		const row = mapBusinessToExportRow(mockBusiness as unknown as BusinessExportPayload, mockLeaders, 1, 0, dateFrom, dateTo)

		expect(row['Fecha inicial fondeo']).toBeDefined()
		expect(row['Fecha final fondeo']).toBeDefined()
		expect(typeof row['Fecha inicial fondeo']).toBe('string')
		expect(row['Fecha inicial fondeo']).not.toBe('')
	})

	it('formatea filtros de fecha del export en calendario Bogotá (regresión timezone)', () => {
		const dateFrom = new Date('2024-06-10T05:00:00.000Z')
		const dateTo = new Date('2024-06-15T05:00:00.000Z')
		const row = mapBusinessToExportRow(
			mockBusiness as unknown as BusinessExportPayload,
			mockLeaders,
			1,
			0,
			dateFrom,
			dateTo
		)
		const expectedFrom = dateFrom.toLocaleDateString('es-CO', {
			timeZone: 'America/Bogota',
		})
		const expectedTo = dateTo.toLocaleDateString('es-CO', {
			timeZone: 'America/Bogota',
		})
		expect(row['Fecha inicial fondeo']).toBe(expectedFrom)
		expect(row['Fecha final fondeo']).toBe(expectedTo)
		expect(expectedFrom).toBe('10/6/2024')
		expect(expectedTo).toBe('15/6/2024')
	})

	it('mapea líder nivel 2 en columnas tras Fecha de Fondeo cuando maxLeaderLevels es 2', () => {
		const row = mapBusinessToExportRow(
			mockBusiness as unknown as BusinessExportPayload,
			mockLeaders,
			2,
			0
		)
		expect(row['Líder 2 nombre']).toBe('Lider Dos')
		expect(row['Líder 2 categoría']).toBe('Gerente')
	})

	it('incluye las cabeceras "Novedad" y "Fecha de Novedad" al final', () => {
		const headers = negociosExportColumnHeaders(1, 0)
		expect(headers[headers.length - 2]).toBe('Novedad')
		expect(headers[headers.length - 1]).toBe('Fecha de Novedad')
	})

	it('mapea Novedad vacía y Fecha de Novedad vacía cuando novedadStatus es null', () => {
		const row = mapBusinessToExportRow(
			{ ...mockBusiness, novedadStatus: null, novedadMarkedAt: null } as unknown as BusinessExportPayload,
			mockLeaders,
			1,
			0
		)
		expect(row['Novedad']).toBe('')
		expect(row['Fecha de Novedad']).toBe('')
	})

	it('mapea Novedad "Pendiente" y su fecha cuando novedadStatus es PENDIENTE', () => {
		const row = mapBusinessToExportRow(
			{
				...mockBusiness,
				novedadStatus: 'PENDIENTE',
				novedadMarkedAt: new Date('2024-03-01T10:00:00Z'),
			} as unknown as BusinessExportPayload,
			mockLeaders,
			1,
			0
		)
		expect(row['Novedad']).toBe('Pendiente')
		expect(row['Fecha de Novedad']).not.toBe('')
	})

	it('mapea Novedad "Resuelta" cuando novedadStatus es RESUELTA', () => {
		const row = mapBusinessToExportRow(
			{
				...mockBusiness,
				novedadStatus: 'RESUELTA',
				novedadMarkedAt: new Date('2024-03-01T10:00:00Z'),
			} as unknown as BusinessExportPayload,
			mockLeaders,
			1,
			0
		)
		expect(row['Novedad']).toBe('Resuelta')
	})
})

describe('computeMaxAnnualColumns', () => {
	it('debe calcular el máximo de columnas de anualidad basado en el plazo', () => {
		const b1 = { term: 5, buyPeriodicity: { name: 'Anual' } } as unknown as BusinessExportPayload
		const b2 = { term: 2, buyPeriodicity: { name: 'Anual' } } as unknown as BusinessExportPayload
		const b3 = { term: 10, buyPeriodicity: { name: 'Mensual' } } as unknown as BusinessExportPayload

		expect(computeMaxAnnualColumns([b1, b2, b3])).toBe(5)
	})
})
