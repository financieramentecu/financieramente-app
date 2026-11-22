import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LeadRelationPanel } from '@/features/leads/components/lead-relation-panel'

const relate = vi.fn()

vi.mock('@/features/leads/hooks/use-relate-lead', () => ({
	useRelateLead: () => ({ state: { status: 'idle', data: undefined, error: '' }, relate }),
	fetchOriginOptions: vi.fn().mockResolvedValue([{ idClientOrigin: 4, name: 'Money Strategy' }]),
	fetchLeadCandidates: vi.fn().mockResolvedValue([
		{ idLead: 239, name: 'Danna Guzman', email: null, phone: null, originTag: 'Money Strategy' },
	]),
}))

describe('LeadRelationPanel', () => {
	it('shows an existing ingress and keeps the relate action hidden', () => {
		render(
			<LeadRelationPanel
				idLead={240}
				canManage
				relations={[
					{
						idLeadLink: 1,
						otherLeadId: 239,
						otherName: 'Danna Guzman',
						originName: 'Monimpas',
						side: 'incoming',
						source: 'AUTO',
						linkedAt: '2026-11-18T18:44:00.000Z',
					},
				]}
			/>
		)

		expect(screen.getByText('Ingresó por Monimpas y está relacionado con Danna Guzman.')).toBeInTheDocument()
		expect(screen.queryByRole('button', { name: 'Relacionar lead' })).not.toBeInTheDocument()
	})

	it('shows the relation on the other lead and does not ask to relate again', () => {
		render(
			<LeadRelationPanel
				idLead={238}
				canManage
				relations={[
					{
						idLeadLink: 1,
						otherLeadId: 237,
						otherName: 'Ana Pérez (prueba)',
						originName: 'Money Flow',
						side: 'related',
						source: 'MANUAL',
						linkedAt: '2026-11-20T19:31:00.000Z',
					},
				]}
			/>
		)

		expect(
			screen.getByText('Está relacionado con Ana Pérez (prueba). Ese ingreso es por Money Flow.')
		).toBeInTheDocument()
		expect(screen.queryByRole('button', { name: 'Relacionar lead' })).not.toBeInTheDocument()
	})

	it('relates the lead after the origin and the other lead are chosen', async () => {
		const user = userEvent.setup()
		relate.mockResolvedValue({
			relation: {
				idLeadLink: 2,
				otherLeadId: 239,
				otherName: 'Danna Guzman',
				originName: 'Money Strategy',
				side: 'incoming',
				source: 'MANUAL',
				linkedAt: '2026-11-20T16:00:00.000Z',
			},
			idUser: 9,
			ownerName: 'Ana Torres',
		})
		const onRelated = vi.fn()
		render(<LeadRelationPanel idLead={240} canManage relations={[]} onRelated={onRelated} />)

		await user.selectOptions(await screen.findByRole('combobox', { name: 'Origen del sistema' }), '4')
		await user.type(screen.getByRole('textbox', { name: 'Buscar lead para relacionar' }), 'Danna')
		await user.click(screen.getByRole('button', { name: 'Buscar' }))
		await user.click(await screen.findByRole('button', { name: /Danna Guzman/ }))
		await user.click(screen.getByRole('button', { name: 'Relacionar lead' }))

		expect(relate).toHaveBeenCalledWith(240, 239, 4)
		expect(await screen.findByText('Ingresó por Money Strategy y está relacionado con Danna Guzman.')).toBeInTheDocument()
		expect(onRelated).toHaveBeenCalledWith({ idUser: 9, ownerName: 'Ana Torres' }, expect.any(Array))
	})

	it('relates the lead without choosing an origin', async () => {
		const user = userEvent.setup()
		relate.mockResolvedValue({
			relation: {
				idLeadLink: 3,
				otherLeadId: 239,
				otherName: 'Danna Guzman',
				originName: 'Sin origen',
				side: 'incoming',
				source: 'MANUAL',
				linkedAt: '2026-11-20T16:00:00.000Z',
			},
			idUser: null,
			ownerName: null,
		})
		render(<LeadRelationPanel idLead={240} canManage relations={[]} />)

		await user.type(screen.getByRole('textbox', { name: 'Buscar lead para relacionar' }), 'Danna')
		await user.click(screen.getByRole('button', { name: 'Buscar' }))
		await user.click(await screen.findByRole('button', { name: /Danna Guzman/ }))
		await user.click(screen.getByRole('button', { name: 'Relacionar lead' }))

		expect(relate).toHaveBeenCalledWith(240, 239, null)
		expect(await screen.findByText('Quedó relacionado con Danna Guzman.')).toBeInTheDocument()
	})
})
