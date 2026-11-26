import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { auth } from '@/lib/auth/nextauth'
import { processBatchService } from '@/features/load-file/services/process-batch.service'
import { MAX_BATCH_RECORDS } from '@/features/load-file/lib/process-batch-limits'
import type { NextRequest } from 'next/server'

vi.mock('@/lib/auth/nextauth')
vi.mock('@/features/load-file/services/process-batch.service', () => ({
	processBatchService: { processBatch: vi.fn() },
}))

const mockAuth = vi.mocked(auth)
const mockProcessBatch = vi.mocked(processBatchService.processBatch)

function requestWith(body: unknown): NextRequest {
	return {
		json: async () => body,
		headers: new Headers(),
	} as unknown as NextRequest
}

const record = { rowNumber: 1, data: {}, isValid: true, errors: [] }

describe('POST /api/carga-archivos/process-batch limits', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockAuth.mockResolvedValue({ user: { id: '1', email: 'a@b.c' } } as never)
	})

	it('rejects with 413 a batch with too many records without processing it', async () => {
		const res = await POST(
			requestWith({
				fileImportId: 1,
				fileType: 'POLIZA',
				headers: [],
				records: Array.from({ length: MAX_BATCH_RECORDS + 1 }, () => record),
			})
		)

		expect(res.status).toBe(413)
		expect(mockProcessBatch).not.toHaveBeenCalled()
	})

	it('still processes a batch within the limits', async () => {
		mockProcessBatch.mockResolvedValue({} as never)

		const res = await POST(
			requestWith({
				fileImportId: 1,
				fileType: 'POLIZA',
				headers: [],
				records: [record],
			})
		)

		expect(res.status).toBe(200)
		expect(mockProcessBatch).toHaveBeenCalledTimes(1)
	})
})
