import type { Prisma } from '@prisma/client'
import type { LeadActivityAttachment } from '@/features/leads/activities/lead-activity-attachment'
import { appendLeadActivityTx } from '@/features/leads/activities/lead-activity.service'

export type LeadSupportCaseStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'RESOLVED' | 'CLOSED'
export type LeadSupportCasePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export interface CreateLeadSupportCaseInput {
  idLead: number
  idBusiness?: number | null
  openedBy: number
  assignedTo?: number | null
  subject: string
  priority: LeadSupportCasePriority
  dueAt?: Date | null
  correlationId: string
}
export interface TransitionLeadSupportCaseInput {
  idLeadSupportCase: number
  idLead: number
  updatedBy: number
  status: LeadSupportCaseStatus
  assignedTo?: number | null
  correlationId: string
  comment?: string
  attachments?: LeadActivityAttachment[]
  resolvedAt?: Date | null
  dueAt?: Date | null
  clearResolvedAt?: boolean
  clearColumnCode?: boolean
}
export interface AddLeadSupportCaseCommentInput {
  idLeadSupportCase: number
  idLead: number
  authorId: number
  body: string
  correlationId: string
}

type CaseWriter = Pick<Prisma.TransactionClient, 'leadSupportCase' | 'leadSupportCaseComment' | 'leadActivity' | 'lead'>

/** Case lifecycle is additive CRM state; linked Business/Payment rows are never written here. */
export async function createLeadSupportCaseTx(tx: CaseWriter, input: CreateLeadSupportCaseInput) {
  const supportCase = await tx.leadSupportCase.create({
    data: {
      idLead: input.idLead,
      idBusiness: input.idBusiness ?? null,
      openedBy: input.openedBy,
      assignedTo: input.assignedTo ?? null,
      subject: input.subject,
      priority: input.priority,
      dueAt: input.dueAt ?? null,
      status: 'OPEN',
    },
  })
  await appendLeadActivityTx(tx, {
    idLead: input.idLead,
    idUser: input.openedBy,
    idBusiness: input.idBusiness ?? null,
    type: 'CASE_OPENED',
    payload: { caseId: supportCase.idLeadSupportCase, subject: supportCase.subject, status: 'OPEN' },
    correlationId: input.correlationId,
  })
  return supportCase
}

export async function transitionLeadSupportCaseTx(tx: CaseWriter, input: TransitionLeadSupportCaseInput) {
  const supportCase = await tx.leadSupportCase.update({
    where: { idLeadSupportCase: input.idLeadSupportCase },
    data: {
      status: input.status,
      ...(input.assignedTo !== undefined ? { assignedTo: input.assignedTo } : {}),
      ...(input.dueAt !== undefined ? { dueAt: input.dueAt } : {}),
      ...(input.clearResolvedAt ? { resolvedAt: null } : {}),
      ...(input.clearColumnCode ? { columnCode: null } : {}),
      ...(input.status === 'RESOLVED' || input.status === 'CLOSED'
        ? { resolvedAt: input.resolvedAt ?? new Date() }
        : {}),
    },
  })
  await appendLeadActivityTx(tx, {
    idLead: input.idLead,
    idUser: input.updatedBy,
    idBusiness: supportCase.idBusiness,
    type: 'CASE_UPDATED',
    payload: {
      caseId: supportCase.idLeadSupportCase,
      subject: supportCase.subject,
      status: input.status,
      ...(input.comment ? { comment: input.comment } : {}),
      ...(input.attachments?.length ? { attachments: input.attachments } : {}),
    },
    correlationId: input.correlationId,
  })
  return supportCase
}

export async function addLeadSupportCaseCommentTx(tx: CaseWriter, input: AddLeadSupportCaseCommentInput) {
  const supportCase = await tx.leadSupportCase.findUnique({
    where: { idLeadSupportCase: input.idLeadSupportCase },
    select: { subject: true },
  })
  const comment = await tx.leadSupportCaseComment.create({
    data: { idLeadSupportCase: input.idLeadSupportCase, authorId: input.authorId, body: input.body },
  })
  await appendLeadActivityTx(tx, {
    idLead: input.idLead,
    idUser: input.authorId,
    type: 'CASE_UPDATED',
    payload: {
      caseId: input.idLeadSupportCase,
      action: 'COMMENTED',
      comment: input.body,
      ...(supportCase?.subject ? { subject: supportCase.subject } : {}),
    },
    correlationId: input.correlationId,
  })
  return comment
}
