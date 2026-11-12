import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { CrmSummaryCards } from '../crm-summary-cards'

describe('CrmSummaryCards', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('does not fetch or render while the CRM reports flag is disabled', () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    const { container } = render(<CrmSummaryCards enabled={false} />)
    expect(container).toBeEmptyDOMElement()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('renders aggregate-only metrics from the scoped summary endpoint', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { opportunities: 9, stageCounts: [], openTasks: 3, overdueTasks: 1, openCases: 2, overdueCases: 0 } }),
    }))
    render(<CrmSummaryCards enabled />)
    await waitFor(() => expect(screen.getByText('Oportunidades activas')).toBeInTheDocument())
    expect(screen.getByText('9')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('1 vencidas')).toBeInTheDocument()
    expect(screen.queryByText(/correo|teléfono/i)).not.toBeInTheDocument()
  })
})
