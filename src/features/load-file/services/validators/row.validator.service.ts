import {
	FILE_TYPES,
	FileType,
	FILE_TYPE_COLUMN_MAP,
} from '../../lib/file-types'
import { cleanLoadFileMoneyValue } from '../../lib/number-utils'
import type { ProcessedRecord } from '../../types/load-file.types'
import { Prisma } from '@prisma/client'

export class RowValidatorService {
	public isEmptyValue(value: unknown): boolean {
		return value === null || value === undefined || String(value).trim() === ''
	}

	public cleanStringValue(value: unknown): string | null {
		if (value === null || value === undefined) return null
		const str = String(value).trim()
		return str === '' ? null : str
	}

	public normalizeColumnName(name: string): string {
		return name
			.toLowerCase()
			.trim()
			.replace(/\s+/g, ' ')
			.replace(/[áàäâ]/g, 'a')
			.replace(/[éèëê]/g, 'e')
			.replace(/[íìïî]/g, 'i')
			.replace(/[óòöô]/g, 'o')
			.replace(/[úùüû]/g, 'u')
			.replace(/ñ/g, 'n')
	}

	public parseDate(value: unknown): Date | null {
		if (!value) return null
		if (value instanceof Date) return value

		const stringValue = String(value)
			.replace(/[\u200B-\u200D\uFEFF]/g, '')
			.trim()
		if (!stringValue) return null

		const date = new Date(stringValue)
		if (!isNaN(date.getTime())) {
			const year = date.getFullYear()
			if (year >= 1900 && year <= 2100) {
				return date
			}
		}

		if (typeof value === 'number') {
			const excelEpoch = new Date(1900, 0, 1)
			excelEpoch.setDate(excelEpoch.getDate() + value - 2)
			const year = excelEpoch.getFullYear()
			if (year >= 1900 && year <= 2100) {
				return excelEpoch
			}
		}

		return null
	}

	public getColumnValue(
		record: ProcessedRecord,
		columnName: string,
		headers: string[]
	): unknown {
		const normalizedRequired = this.normalizeColumnName(columnName)
		const normalizedHeaders = headers.map((h) => ({
			original: h,
			normalized: this.normalizeColumnName(h || ''),
		}))

		const exactMatch = normalizedHeaders.find(
			(h) => h.normalized === normalizedRequired
		)
		if (exactMatch) return record.data[exactMatch.original]

		const requiredWords = normalizedRequired
			.split(' ')
			.filter((w) => w.length > 0)

		const fuzzyMatch = normalizedHeaders.find((h) => {
			if (requiredWords.length === 1) {
				const wordRegex = new RegExp(`\\b${requiredWords[0]}\\b`, 'i')
				return wordRegex.test(h.normalized)
			}
			if (requiredWords.length > 1) {
				let lastIndex = -1
				for (const word of requiredWords) {
					const wordIndex = h.normalized.indexOf(word)
					if (wordIndex === -1 || wordIndex < lastIndex) {
						return false
					}
					lastIndex = wordIndex
				}
				return true
			}
			return false
		})

		if (fuzzyMatch) return record.data[fuzzyMatch.original]
		return null
	}

	public validateAndExtractRow(
		record: ProcessedRecord,
		headers: string[],
		fileType: FileType
	): {
		contract: string
		descripcion: string | null
		base: Prisma.Decimal
		commission: Prisma.Decimal
		startDate: Date | null
		endDate: Date | null
	} {
		const columnMapMap = FILE_TYPE_COLUMN_MAP
		let contractCol = ''
		let descripCol = ''
		let baseCol = ''
		let commCol = ''

		if (fileType === FILE_TYPES.POLIZA) {
			contractCol = columnMapMap[FILE_TYPES.POLIZA].contract
			descripCol = columnMapMap[FILE_TYPES.POLIZA].descripcion
			baseCol = columnMapMap[FILE_TYPES.POLIZA].base
			commCol = columnMapMap[FILE_TYPES.POLIZA].commission
		} else {
			contractCol = columnMapMap[FILE_TYPES.VOLUNTARIA].contract
			descripCol = columnMapMap[FILE_TYPES.VOLUNTARIA].descripcion
			baseCol = columnMapMap[FILE_TYPES.VOLUNTARIA].base
			commCol = columnMapMap[FILE_TYPES.VOLUNTARIA].commission
		}

		const ctoRaw = this.getColumnValue(record, contractCol, headers)
		const contract = ctoRaw ? String(ctoRaw).trim() : null
		if (!contract) {
			throw new Error('El campo Cto (ID de contrato) está vacío')
		}

		const descripcionRaw = this.getColumnValue(record, descripCol, headers)
		const descripcion = this.cleanStringValue(descripcionRaw)

		const baseRaw = this.getColumnValue(record, baseCol, headers)
		if (this.isEmptyValue(baseRaw)) {
			throw new Error('El campo Base es requerido')
		}
		const baseNumeric = cleanLoadFileMoneyValue(baseRaw)
		if (baseNumeric === null) {
			throw new Error(`Valor numérico inválido en ${baseCol}`)
		}

		const comRaw = this.getColumnValue(record, commCol, headers)
		if (this.isEmptyValue(comRaw)) {
			throw new Error('El campo Comisión es requerido')
		}
		const commissionNumeric = cleanLoadFileMoneyValue(comRaw)
		if (commissionNumeric === null) {
			throw new Error(`Valor numérico inválido en ${commCol}`)
		}

		let startDate: Date | null = null
		let endDate: Date | null = null

		if (fileType === FILE_TYPES.VOLUNTARIA) {
			const desdeRaw = this.getColumnValue(
				record,
				columnMapMap[FILE_TYPES.VOLUNTARIA].desde,
				headers
			)
			const hastaRaw = this.getColumnValue(
				record,
				columnMapMap[FILE_TYPES.VOLUNTARIA].hasta,
				headers
			)

			startDate = this.parseDate(desdeRaw)
			endDate = this.parseDate(hastaRaw)

			if (!startDate || !endDate) {
				throw new Error('Las fechas Desde o Hasta están vacías o son inválidas')
			}
		}

		return {
			contract,
			descripcion,
			base: new Prisma.Decimal(baseNumeric.toString()),
			commission: new Prisma.Decimal(commissionNumeric.toString()),
			startDate,
			endDate,
		}
	}
}

export const rowValidatorService = new RowValidatorService()
