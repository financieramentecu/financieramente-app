import { describe, it, expect } from 'vitest'
import { 
    negociosExportColumnHeaders, 
    mapBusinessToExportRow,
    computeMaxAnnualColumns
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
            email: 'juan@example.com'
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

    it('debe tener las cabeceras en el orden y nombres correctos', () => {
        const headers = negociosExportColumnHeaders(1, 0)
        expect(headers[0]).toBe('Agente')
        expect(headers[1]).toBe('Nombres y Apellidos del Cliente')
        expect(headers[2]).toBe('Cedula del cliente')
        expect(headers[3]).toBe('Origen del cliente')
        expect(headers[4]).toBe('Email Cliente')
        expect(headers[5]).toBe('Compañía')
        expect(headers[6]).toBe('Plazo')
        expect(headers[7]).toBe('Periodicidad')
        expect(headers[8]).toBe('Es anualidad')
        expect(headers[9]).toBe('Producto')
        expect(headers[10]).toBe('Número de contrato')
        expect(headers[11]).toBe('Moneda')
        expect(headers[12]).toBe('Valor negocio')
        expect(headers[13]).toBe('Líder encargado')
        expect(headers[14]).toBe('Categoría líder')
        expect(headers[15]).toBe('Estado del negocio')
        expect(headers[16]).toBe('Fecha de emisión')
        expect(headers[17]).toBe('Fecha de fondeo')
        expect(headers[18]).toBe('Fecha de creación')
        // ... anualidades si existen
        expect(headers[headers.length - 2]).toBe('Mes')
        expect(headers[headers.length - 1]).toBe('Año')
    })

    it('debe mapear los datos correctamente incluyendo Mes y Año', () => {
        const row = mapBusinessToExportRow(mockBusiness as unknown as BusinessExportPayload, mockLeaders, 1, 0)
        
        expect(row['Agente']).toBe('Agente Pro')
        expect(row['Nombres y Apellidos del Cliente']).toBe('Juan Perez')
        expect(row['Cedula del cliente']).toBe('123456')
        expect(row['Mes']).toBe('Febrero') // Nombre del mes del mock data
        expect(row['Año']).toBe(2024)
        expect(row['Es anualidad']).toBe('No')
        expect(row['Líder encargado']).toBe('Lider Uno')
        expect(row['Categoría líder']).toBe('Director')
    })

    it('debe marcar "Sí" en Es anualidad si tiene pagos anuales', () => {
        const businessWithAnnuity = {
            ...mockBusiness,
            annualPayments: [{ id: 1 }]
        }
        const row = mapBusinessToExportRow(businessWithAnnuity as unknown as BusinessExportPayload, [], 0, 0)
        expect(row['Es anualidad']).toBe('Sí')
    })

    it('debe extraer Mes y Año basándose en la zona horaria de Bogotá (Regresión)', () => {
        // 2024-01-01T02:00:00Z es 2023-12-31T21:00:00-05:00 en Bogotá
        const midnightBussiness = {
            ...mockBusiness,
            dateIssued: new Date('2024-01-01T02:00:00Z')
        }
        
        const row = mapBusinessToExportRow(midnightBussiness as unknown as BusinessExportPayload, [], 0, 0)
        
        expect(row['Mes']).toBe('Diciembre')
        expect(row['Año']).toBe(2023)
    })
})

describe('computeMaxAnnualColumns', () => {
    it('debe calcular el máximo de columnas de anualidad basado en el plazo', () => {
        const b1 = { term: 5, buyPeriodicity: { name: 'Anual' } } as unknown as BusinessExportPayload
        const b2 = { term: 2, buyPeriodicity: { name: 'Anual' } } as unknown as BusinessExportPayload
        const b3 = { term: 10, buyPeriodicity: { name: 'Mensual' } } as unknown as BusinessExportPayload
        
        expect(computeMaxAnnualColumns([b1, b2, b3])).toBe(5) // Solo considera Anual
    })
})
