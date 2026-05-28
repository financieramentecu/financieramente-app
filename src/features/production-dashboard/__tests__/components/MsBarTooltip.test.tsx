import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MsBarTooltip } from '../../components/MsBarTooltip'
import type { MsBarDatum } from '../../types/production-kpi.types'

function makeDatum(overrides: Partial<MsBarDatum> = {}): MsBarDatum {
  return {
    userId: 1,
    fullName: 'Ana García',
    levelCode: 'MS_SENIOR',
    foreignUsd: 185000,
    nationalUsd: 72300,
    nationalUsdDisplay: 72300,
    totalCop: 292815000,
    foreignCount: 45,
    nationalCount: 38,
    ...overrides,
  }
}

describe('MsBarTooltip', () => {
  it('returns null when inactive', () => {
    const { container } = render(
      <MsBarTooltip active={false} payload={[]} trmRate={4050} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders foreign bar tooltip in AC-2 format', () => {
    render(
      <MsBarTooltip
        active
        trmRate={4050}
        payload={[
          {
            dataKey: 'foreignUsd',
            value: 185000,
            payload: makeDatum(),
          },
        ]}
      />
    )
    expect(screen.getByText(/USD 185\.000,00 · 45 negocios/)).toBeTruthy()
  })

  it('renders national bar tooltip in AC-3 format with COP and USD', () => {
    render(
      <MsBarTooltip
        active
        trmRate={4050}
        payload={[
          {
            dataKey: 'nationalUsdDisplay',
            value: 72300,
            payload: makeDatum(),
          },
        ]}
      />
    )
    expect(
      screen.getByText(/USD 72\.300,00 \(COP 292\.815\.000\) · 38 negocios/)
    ).toBeTruthy()
  })

  it('suppresses tooltip when foreignUsd is zero (AC-4)', () => {
    const { container } = render(
      <MsBarTooltip
        active
        trmRate={4050}
        payload={[
          {
            dataKey: 'foreignUsd',
            value: 0,
            payload: makeDatum({ foreignUsd: 0, foreignCount: 0 }),
          },
        ]}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('suppresses national tooltip when nationalUsd is null (TRM unavailable)', () => {
    const { container } = render(
      <MsBarTooltip
        active
        trmRate={null}
        payload={[
          {
            dataKey: 'nationalUsdDisplay',
            value: 0,
            payload: makeDatum({
              nationalUsd: null,
              nationalUsdDisplay: 0,
            }),
          },
        ]}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('suppresses national tooltip when nationalUsdDisplay is zero', () => {
    const { container } = render(
      <MsBarTooltip
        active
        trmRate={4050}
        payload={[
          {
            dataKey: 'nationalUsdDisplay',
            value: 0,
            payload: makeDatum({
              nationalUsd: 0,
              nationalUsdDisplay: 0,
              nationalCount: 0,
              totalCop: 0,
            }),
          },
        ]}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('uses singular negocio when count is 1', () => {
    render(
      <MsBarTooltip
        active
        trmRate={4050}
        payload={[
          {
            dataKey: 'foreignUsd',
            value: 1000,
            payload: makeDatum({ foreignUsd: 1000, foreignCount: 1 }),
          },
        ]}
      />
    )
    expect(screen.getByText(/1 negocio/)).toBeTruthy()
    expect(screen.queryByText(/negocios/)).toBeNull()
  })
})
