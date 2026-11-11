import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { CrmReportSheet } from '@/features/leads/reports/build-crm-report-sheets'

const PAGE_WIDTH = 792
const PAGE_HEIGHT = 612
const MARGIN = 36
const FONT_SIZE = 8
const TITLE_SIZE = 14
const LINE = FONT_SIZE + 4

function pdfSafe(value: string): string {
	return value.replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '')
}

function clip(value: string, width: number, fontSize: number): string {
	const max = Math.max(4, Math.floor(width / (fontSize * 0.5)))
	const safe = pdfSafe(value)
	return safe.length <= max ? safe : `${safe.slice(0, max - 3)}...`
}

/** Landscape PDF of the same sheets the Excel export contains. */
export async function buildCrmReportPdf(
	sheets: readonly CrmReportSheet[]
): Promise<Uint8Array> {
	const document = await PDFDocument.create()
	const font = await document.embedFont(StandardFonts.Helvetica)
	const bold = await document.embedFont(StandardFonts.HelveticaBold)
	let page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT])
	let y = PAGE_HEIGHT - MARGIN

	function nextPage() {
		page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT])
		y = PAGE_HEIGHT - MARGIN
	}

	function ensure(height: number) {
		if (y - height < MARGIN) nextPage()
	}

	for (const sheet of sheets) {
		ensure(TITLE_SIZE + LINE * 2)
		page.drawText(pdfSafe(sheet.name), {
			x: MARGIN,
			y,
			size: TITLE_SIZE,
			font: bold,
			color: rgb(0.06, 0.28, 0.28),
		})
		y -= TITLE_SIZE + 8

		const headers = sheet.rows[0] ?? []
		const width = (PAGE_WIDTH - MARGIN * 2) / Math.max(headers.length, 1)
		const drawRow = (cells: readonly string[], header: boolean) => {
			ensure(LINE)
			cells.forEach((cell, index) => {
				page.drawText(clip(cell, width - 6, FONT_SIZE), {
					x: MARGIN + index * width,
					y,
					size: FONT_SIZE,
					font: header ? bold : font,
					color: rgb(0.1, 0.1, 0.1),
				})
			})
			y -= LINE
		}

		if (headers.length > 0) drawRow(headers, true)
		for (const row of sheet.rows.slice(1)) drawRow(row, false)
		y -= LINE
	}

	return document.save()
}
