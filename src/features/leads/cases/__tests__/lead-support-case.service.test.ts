import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  addLeadSupportCaseCommentTx,
  createLeadSupportCaseTx,
  transitionLeadSupportCaseTx,
} from '@/features/leads/cases/lead-support-case.service'

const create = vi.fn()
const update = vi.fn()
const commentCreate = vi.fn()
const appendLeadActivityTx = vi.fn()

vi.mock('@/features/leads/activities/lead-activity.service', () => ({
  appendLeadActivityTx: (...args: unknown[]) => appendLeadActivityTx(...args),
}))

const findUnique = vi.fn()
const tx = {
  leadSupportCase: { create, update, findUnique },
  leadSupportCaseComment: { create: commentCreate },
  leadActivity: { create: vi.fn() },
}

describe('lead support case service', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates a scoped lead case and appends one CASE_OPENED timeline event', async () => {
    create.mockResolvedValue({ idLeadSupportCase: 9, idLead: 4, subject: 'Solicitud de devolución' })
    appendLeadActivityTx.mockResolvedValue({ idLeadActivity: 1 })
    await createLeadSupportCaseTx(tx as never, { idLead: 4, idBusiness: 70, openedBy: 7, assignedTo: 8, subject: 'Solicitud de devolución', priority: 'HIGH', correlationId: 'case-4-open-1' })
    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({ idLead: 4, idBusiness: 70, openedBy: 7, assignedTo: 8, status: 'OPEN', priority: 'HIGH' }) })
    expect(appendLeadActivityTx).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ type: 'CASE_OPENED', idLead: 4, idUser: 7 }))
  })

  it('transitions a case without mutating linked business or payment records', async () => {
    update.mockResolvedValue({ idLeadSupportCase: 9, idLead: 4, status: 'RESOLVED' })
    appendLeadActivityTx.mockResolvedValue({ idLeadActivity: 2 })
    await transitionLeadSupportCaseTx(tx as never, { idLeadSupportCase: 9, idLead: 4, updatedBy: 7, status: 'RESOLVED', correlationId: 'case-4-resolve-1' })
    expect(update).toHaveBeenCalledWith({ where: { idLeadSupportCase: 9 }, data: expect.objectContaining({ status: 'RESOLVED', resolvedAt: expect.any(Date) }) })
    expect(appendLeadActivityTx).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ type: 'CASE_UPDATED', idLead: 4, idUser: 7 }))
  })

  it('stores the chosen close date when the case is closed', async () => {
    const resolvedAt = new Date('2026-11-09T12:00:00.000Z')
    update.mockResolvedValue({ idLeadSupportCase: 9, idLead: 4, status: 'CLOSED', resolvedAt })
    appendLeadActivityTx.mockResolvedValue({ idLeadActivity: 4 })
    await transitionLeadSupportCaseTx(tx as never, {
      idLeadSupportCase: 9,
      idLead: 4,
      updatedBy: 7,
      status: 'CLOSED',
      resolvedAt,
      correlationId: 'case-4-close-1',
    })
    expect(update).toHaveBeenCalledWith({
      where: { idLeadSupportCase: 9 },
      data: expect.objectContaining({ status: 'CLOSED', resolvedAt }),
    })
  })

  it('adds an immutable plain-text comment and timeline event', async () => {
    findUnique.mockResolvedValue({ subject: 'Devolución' })
    commentCreate.mockResolvedValue({ idLeadSupportCaseComment: 2 })
    appendLeadActivityTx.mockResolvedValue({ idLeadActivity: 3 })
    await addLeadSupportCaseCommentTx(tx as never, { idLeadSupportCase: 9, idLead: 4, authorId: 7, body: 'Se solicitó soporte documental.', correlationId: 'case-4-comment-1' })
    expect(commentCreate).toHaveBeenCalledWith({ data: { idLeadSupportCase: 9, authorId: 7, body: 'Se solicitó soporte documental.' } })
    expect(appendLeadActivityTx).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ type: 'CASE_UPDATED', payload: expect.objectContaining({ action: 'COMMENTED' }) }))
  })
})
