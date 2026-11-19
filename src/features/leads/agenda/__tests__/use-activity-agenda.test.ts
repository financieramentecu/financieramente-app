import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { fetchActivityBoard, moveCase, moveTask } from '@/features/leads/agenda/agenda-api'
import type { ActivityBoardDto } from '@/features/leads/agenda/agenda.types'
import { useActivityBoard } from '@/features/leads/agenda/use-activity-agenda'

vi.mock('@/features/leads/agenda/agenda-api', () => ({
	fetchActivityBoard: vi.fn(),
	moveCase: vi.fn(),
	moveTask: vi.fn(),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const board: ActivityBoardDto = {
	tasks: [{
		idLeadTask: 1, idLead: 10, leadName: 'Lead', title: 'Call', type: 'CALL',
		dueAt: null, status: 'OPEN', completedAt: null, createdAt: '2026-11-19T15:00:00Z',
		assigneeName: 'Ana', creatorName: 'Ana', commentCount: 0, columnCode: null,
	}],
	cases: [{
		idLeadSupportCase: 2, idLead: 10, leadName: 'Lead', subject: 'Support',
		status: 'OPEN', priority: 'MEDIUM', dueAt: null, resolvedAt: null,
		createdAt: '2026-11-19T15:00:00Z', assigneeName: 'Ana', commentCount: 0, columnCode: null,
	}],
}

async function loadBoard() {
	const hook = renderHook(() => useActivityBoard([]))
	await waitFor(() => expect(hook.result.current.state.status).toBe('success'))
	return hook
}

describe('useActivityBoard placement', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(fetchActivityBoard).mockResolvedValue(board)
		vi.mocked(moveTask).mockResolvedValue(undefined)
		vi.mocked(moveCase).mockResolvedValue(undefined)
	})

	it('persists a task move even when React defers the state updater', async () => {
		const { result } = await loadBoard()
		await act(async () => result.current.place({ kind: 'task', id: 1 }, 'xReview'))
		expect(moveTask).toHaveBeenCalledExactlyOnceWith(1, 'xReview')
		expect(result.current.state.data?.tasks[0].columnCode).toBe('xReview')
	})

	it('persists a case move', async () => {
		const { result } = await loadBoard()
		await act(async () => result.current.place({ kind: 'case', id: 2 }, 'done'))
		expect(moveCase).toHaveBeenCalledExactlyOnceWith(2, 'done')
		expect(result.current.state.data?.cases[0].status).toBe('RESOLVED')
	})

	it('reloads server state when persisting the move fails', async () => {
		vi.mocked(moveTask).mockRejectedValueOnce(new Error('network'))
		const { result } = await loadBoard()
		await act(async () => result.current.place({ kind: 'task', id: 1 }, 'xReview'))
		expect(moveTask).toHaveBeenCalledExactlyOnceWith(1, 'xReview')
		expect(fetchActivityBoard).toHaveBeenCalledTimes(2)
		await waitFor(() => expect(result.current.state.data?.tasks[0].columnCode).toBeNull())
		expect(toast.error).toHaveBeenCalled()
	})

	it('does not persist a move to the current column or an absent card', async () => {
		const { result } = await loadBoard()
		await act(async () => result.current.place({ kind: 'task', id: 1 }, 'upcoming'))
		await act(async () => result.current.place({ kind: 'case', id: 999 }, 'done'))
		expect(moveTask).not.toHaveBeenCalled()
		expect(moveCase).not.toHaveBeenCalled()
	})
})
