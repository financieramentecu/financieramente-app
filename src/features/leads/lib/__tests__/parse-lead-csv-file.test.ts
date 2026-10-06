import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { parseLeadCsvFile } from '@/features/leads/lib/parse-lead-csv-file'
import { LEAD_CSV_HEADERS } from '@/features/leads/lib/lead-csv-template'

function workbookFromCsv(csv: string): XLSX.WorkBook {
	return XLSX.read(csv, { type: 'string' })
}

describe('parseLeadCsvFile', () => {
	it('rejects the whole file when header order/count mismatches', () => {
		const workbook = workbookFromCsv('nombre,id_externo_crm\nJuan,CRM-1\n')

		const result = parseLeadCsvFile(workbook)

		expect(result.rejected).toBe(true)
	})

	it('parses UTF-8 accented headers/values correctly', () => {
		const csv = `${LEAD_CSV_HEADERS.join(',')}\nCRM-1,José,Muñoz,3001234567,jose@x.com,Contactado,open,2023-01-15T10:00:00-05:00,Facebook Ánuncio,owner@x.com,Yohan España\n`
		const workbook = workbookFromCsv(csv)

		const result = parseLeadCsvFile(workbook)

		expect(result.rejected).toBe(false)
		if (!result.rejected) {
			expect(result.rows[0].nombre).toBe('José')
			expect(result.rows[0].apellido).toBe('Muñoz')
			expect(result.rows[0].origen).toBe('Facebook Ánuncio')
			expect(result.rows[0].propietario_nombre).toBe('Yohan España')
		}
	})

	it('maps row objects 1:1 to LEAD_CSV_HEADERS keys', () => {
		const csv = `${LEAD_CSV_HEADERS.join(',')}\nCRM-1,Juan,Perez,300,a@x.com,Contactado,open,2023-01-15T10:00:00-05:00,Feria,owner@x.com,Yohan España\n`
		const workbook = workbookFromCsv(csv)

		const result = parseLeadCsvFile(workbook)

		expect(result.rejected).toBe(false)
		if (!result.rejected) {
			expect(Object.keys(result.rows[0]).sort()).toEqual([...LEAD_CSV_HEADERS].sort())
		}
	})

	it('rejects a file carrying only the previous 10 headers, naming the 11 expected headers', () => {
		const legacyHeaders = LEAD_CSV_HEADERS.filter((header) => header !== 'propietario_nombre')
		const csv = `${legacyHeaders.join(',')}\nCRM-1,Juan,Perez,300,a@x.com,Contactado,open,2023-01-15T10:00:00-05:00,Feria,owner@x.com\n`
		const workbook = workbookFromCsv(csv)

		const result = parseLeadCsvFile(workbook)

		expect(result.rejected).toBe(true)
		if (result.rejected) {
			expect(result.reason).toContain('propietario_nombre')
		}
	})

	it('maps propietario_nombre into each row object from an 11-header file', () => {
		const csv = `${LEAD_CSV_HEADERS.join(',')}\nCRM-1,Juan,Perez,300,a@x.com,Contactado,open,2023-01-15T10:00:00-05:00,Feria,,Yohan España\n`
		const workbook = workbookFromCsv(csv)

		const result = parseLeadCsvFile(workbook)

		expect(result.rejected).toBe(false)
		if (!result.rejected) {
			expect(result.rows[0].propietario_nombre).toBe('Yohan España')
		}
	})
})
