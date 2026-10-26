import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { BusinessTableSection } from '../BusinessTableSection'
import type { BusinessRowActionsProps } from '../BusinessRowActions'
import type { Business } from '@/features/negocios/types/business.types'
import { BUSINESS_STATUS } from '@/features/negocios/types/business-entity.types'

const { rowActionsProps, commentsApiList } = vi.hoisted(() => ({
	rowActionsProps: [] as Array<Record<string, unknown>>,
	commentsApiList: vi.fn(),
}))

vi.mock('../BusinessRowActions', () => ({
	BusinessRowActions: (props: Record<string, unknown>) => {
		rowActionsProps.push(props)
		return <div data-testid={`row-actions-${String(props.businessId)}`} />
	},
}))

vi.mock('@/features/comments/lib/comments-api', () => ({
	commentsApi: { list: commentsApiList },
}))

vi.mock('@/features/shared/lib/format-date', () => ({
	formatDateBogota: (d: string | null | undefined) => (d ? `formatted:${d}` : '—'),
}))

vi.mock('next/navigation', () => ({
	useRouter: () => ({ replace: vi.fn() }),
	useSearchParams: () => new URLSearchParams(),
}))

function buildBusiness(overrides: Partial<Business> = {}): Business {
	return {
		id: '1',
		identification: '123',
		clientName: 'Cliente Test',
		contract: 'PN0001',
		user: { avatar: '', name: 'Agente Test' },
		email: 'test@test.com',
		termPeriod: '12 meses',
		term: 12,
		periodicityName: 'Mensual',
		dateIssued: '2026-01-15T12:00:00.000Z',
		dateAnchored: '2026-02-15T12:00:00.000Z',
		novedadStatus: null,
		novedadMarkedAt: null,
		date: '2026-01-01T12:00:00.000Z',
		value: 1000,
		product: 'Producto',
		companyName: 'Compañía',
		clientOriginName: 'Origen',
		status: 'Venta Efectuado',
		statusCode: BUSINESS_STATUS.VENTA_EFECTUADA,
		hasPayments: false,
		hasPendingPaymentFunding: false,
		numAportes: null,
		supportCount: 1,
		commentCount: 0,
		observations: null,
		currency: { id: 1, name: 'COP' },
		...overrides,
	}
}

function propsForBusiness(id: number): BusinessRowActionsProps | undefined {
	return rowActionsProps.find((props) => props.businessId === id) as BusinessRowActionsProps | undefined
}

describe('BusinessTableSection — comments indicator wiring', () => {
	const eventSourceSpy = vi.fn()

	beforeEach(() => {
		rowActionsProps.length = 0
		commentsApiList.mockReset()
		eventSourceSpy.mockReset()
		vi.stubGlobal('EventSource', eventSourceSpy)
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('passes each row commentCount to BusinessRowActions', () => {
		render(
			<BusinessTableSection
				data={[
					buildBusiness({ id: '1', commentCount: 145 }),
					buildBusiness({ id: '2', commentCount: 0 }),
				]}
				onAddBusiness={vi.fn()}
				onEditBusiness={vi.fn()}
			/>
		)

		expect(propsForBusiness(1)?.commentCount).toBe(145)
		expect(propsForBusiness(2)?.commentCount).toBe(0)
	})

	it('forwards onCommentCreated to BusinessRowActions unchanged', () => {
		const onCommentCreated = vi.fn()
		render(
			<BusinessTableSection
				data={[buildBusiness({ id: '1', commentCount: 3 })]}
				onAddBusiness={vi.fn()}
				onEditBusiness={vi.fn()}
				onCommentCreated={onCommentCreated}
			/>
		)

		expect(propsForBusiness(1)?.onCommentCreated).toBe(onCommentCreated)
	})

	it('keeps passing the row contract unchanged', () => {
		render(
			<BusinessTableSection
				data={[buildBusiness({ id: '1', contract: '-', commentCount: 3 })]}
				onAddBusiness={vi.fn()}
				onEditBusiness={vi.fn()}
			/>
		)

		expect(propsForBusiness(1)?.contract).toBe('-')
	})

	it('requests no comments and opens no EventSource while rendering several rows', () => {
		render(
			<BusinessTableSection
				data={[
					buildBusiness({ id: '1', commentCount: 4 }),
					buildBusiness({ id: '2', commentCount: 9 }),
					buildBusiness({ id: '3', commentCount: 1 }),
				]}
				onAddBusiness={vi.fn()}
				onEditBusiness={vi.fn()}
			/>
		)

		expect(rowActionsProps.length).toBeGreaterThanOrEqual(3)
		expect(commentsApiList).not.toHaveBeenCalled()
		expect(eventSourceSpy).not.toHaveBeenCalled()
	})
})
