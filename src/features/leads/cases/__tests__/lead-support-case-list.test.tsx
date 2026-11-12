import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { LeadSupportCaseList } from '@/features/leads/cases/lead-support-case-list'

describe('LeadSupportCaseList', () => {
  it('keeps cases hidden while the flag is disabled', () => {
    render(<LeadSupportCaseList leadId={4} enabled={false} />)
    expect(screen.queryByText('Casos de soporte')).not.toBeInTheDocument()
  })

  it('creates a support case from the lead detail', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { idLeadSupportCase: 12 } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) })
    vi.stubGlobal('fetch', fetchMock)
    render(<LeadSupportCaseList leadId={4} enabled />)
    fireEvent.change(await screen.findByLabelText('Asunto del caso'), { target: { value: 'Necesito ayuda' } })
    fireEvent.click(screen.getByRole('button', { name: 'Abrir caso' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/leads/4/cases', expect.objectContaining({ method: 'POST' })))
  })

  it('renders a redacted support-case summary and no raw JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ idLeadSupportCase: 9, subject: 'Solicitud de devolución', status: 'OPEN', priority: 'HIGH', dueAt: null }] }),
    }))
    render(<LeadSupportCaseList leadId={4} enabled />)
    expect(await screen.findByText('Solicitud de devolución')).toBeInTheDocument()
    expect(screen.getByText('Abierto')).toBeInTheDocument()
    expect(screen.getByText('Alta', { selector: 'div' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cerrar caso' })).toBeInTheDocument()
  })

  it('closes an open case', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ idLeadSupportCase: 9, subject: 'Solicitud de devolución', status: 'OPEN', priority: 'HIGH', dueAt: null }] }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { idLeadSupportCase: 9, status: 'CLOSED' } }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ idLeadSupportCase: 9, subject: 'Solicitud de devolución', status: 'CLOSED', priority: 'HIGH', dueAt: null }] }),
      })
    vi.stubGlobal('fetch', fetchMock)
    render(<LeadSupportCaseList leadId={4} enabled />)
    fireEvent.click(await screen.findByRole('button', { name: 'Cerrar caso' }))
    fireEvent.change(screen.getByLabelText('Qué pasó'), { target: { value: 'Se devolvió el pago' } })
    fireEvent.change(screen.getByLabelText('Fecha de cierre'), { target: { value: '2026-11-09' } })
    expect(screen.getByRole('button', { name: 'Adjuntar archivo' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar caso' }))
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/crm/cases/9',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            status: 'CLOSED',
            comment: 'Se devolvió el pago',
            resolvedAt: '2026-11-09T12:00:00.000Z',
          }),
        })
      )
    )
    expect(await screen.findByText('Cerrado')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cerrar caso' })).not.toBeInTheDocument()
  })
})
