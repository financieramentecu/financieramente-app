import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LeadDetailSheet } from '@/features/leads/components/lead-detail-sheet'
import type { LeadDetail } from '@/features/leads/types/lead.types'

const mockDeleteLead = vi.fn()
let mockState: { status: string; data: unknown; error: string } = {
	status: 'idle',
	data: undefined,
	error: '',
}

vi.mock('@/features/leads/hooks/use-delete-lead', () => ({
	useDeleteLead: () => ({ state: mockState, deleteLead: mockDeleteLead }),
}))

const advisorAccess = vi.hoisted(() => ({
	current: {
		state: {
			status: 'success' as const,
			data: [] as Array<{ idUser: number; name: string }>,
			error: '',
		},
		canLead: false,
	},
}))

vi.mock('@/features/leads/hooks/use-hierarchy-advisors', () => ({
	useHierarchyAdvisors: () => advisorAccess.current,
}))

vi.mock('@/features/leads/hooks/use-assign-lead-owner', () => ({
	useAssignLeadOwner: () => ({
		state: { status: 'idle', data: undefined, error: '' },
		assign: vi.fn(),
	}),
}))

vi.mock('@/features/leads/components/lead-relation-panel', () => ({
	LeadRelationPanel: () => <section>Relación de leads</section>,
}))

vi.mock('@/features/leads/activities/lead-activity-timeline', () => ({
	LeadActivityTimeline: () => <section>Timeline</section>,
}))

vi.mock('@/features/leads/custom-fields/lead-crm-fields-section', () => ({
	LeadCrmFieldsSection: ({ canEdit }: { canEdit: boolean }) => (
		<section>CRM fields {canEdit ? 'editable' : 'read-only'}</section>
	),
}))

beforeEach(() => {
	advisorAccess.current = {
		state: { status: 'success', data: [], error: '' },
		canLead: false,
	}
})

function buildLead(overrides: Partial<LeadDetail> = {}): LeadDetail {
	return {
		idLead: 1,
		externalCrmId: 'crm-1',
		name: 'Juan',
		lastName: 'Perez',
		email: 'juan@example.com',
		phone: '3001234567',
		identityNumber: '123456789',
		originTag: 'facebook',
		externalUrl: null,
		idUser: 5,
		ownerName: 'Ana Torres',
		idLeadFunnelColumn: 1,
		idBusiness: null,
		outcomeStatus: 'OPEN',
		createdAt: new Date(),
		updatedAt: new Date(),
		inactiveDays: null,
		tags: [],
		estimatedValue: null,
		probability: null,
		formSubmissions: [],
		relations: [],
		...overrides,
	}
}

describe('LeadDetailSheet', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockState = { status: 'idle', data: undefined, error: '' }
		advisorAccess.current = {
			state: { status: 'success', data: [], error: '' },
			canLead: false,
		}
	})

	it('opens immediately with the known name while the lead is still loading', () => {
		render(
			<LeadDetailSheet
				lead={null}
				open={true}
				previewName="Camila Herrera"
				onOpenChange={vi.fn()}
			/>
		)
		expect(screen.getByRole('dialog')).toBeInTheDocument()
		expect(
			screen.getByRole('heading', { name: 'Camila Herrera' })
		).toBeInTheDocument()
		expect(screen.getByRole('status')).toHaveTextContent('Cargando el lead…')
	})

	it('does not render "Ver en CRM"', () => {
		render(
			<LeadDetailSheet
				lead={buildLead({ externalUrl: 'https://crm.example/lead/1' })}
				open={true}
				onOpenChange={vi.fn()}
			/>
		)
		expect(screen.queryByText('Ver en CRM')).not.toBeInTheDocument()
	})

	it('hides Money Strategy assignment from an advisor who leads nobody', () => {
		render(
			<LeadDetailSheet
				lead={buildLead()}
				open={true}
				onOpenChange={vi.fn()}
				canManageCrm
			/>
		)
		expect(
			screen.queryByRole('combobox', { name: 'Money Strategy disponibles' })
		).not.toBeInTheDocument()
	})

	it('shows Money Strategy assignment to the leader in charge', () => {
		advisorAccess.current = {
			state: {
				status: 'success',
				data: [{ idUser: 9, name: 'Laura Gomez' }],
				error: '',
			},
			canLead: true,
		}
		render(
			<LeadDetailSheet lead={buildLead()} open={true} onOpenChange={vi.fn()} />
		)
		expect(
			screen.getByRole('combobox', { name: 'Money Strategy disponibles' })
		).toBeInTheDocument()
	})

	it('shows "Convertir a negocio" when the lead is not yet converted', () => {
		render(
			<LeadDetailSheet
				lead={buildLead({ idBusiness: null })}
				open={true}
				onOpenChange={vi.fn()}
				canManageCrm
			/>
		)
		expect(screen.getByText('Convertir a negocio')).toBeInTheDocument()
		expect(screen.queryByText('Ver negocio')).not.toBeInTheDocument()
	})

	it('shows "Ver negocio" once the lead is converted', () => {
		render(
			<LeadDetailSheet
				lead={buildLead({ idBusiness: 42 })}
				open={true}
				onOpenChange={vi.fn()}
			/>
		)
		expect(screen.getByText('Ver negocio')).toBeInTheDocument()
		expect(screen.queryByText('Convertir a negocio')).not.toBeInTheDocument()
	})

	it('renders the owner name and avatar when ownerName is present', () => {
		render(
			<LeadDetailSheet
				lead={buildLead({ ownerName: 'Ana Torres' })}
				open={true}
				onOpenChange={vi.fn()}
			/>
		)
		expect(screen.getByText('Ana Torres')).toBeInTheDocument()
		expect(screen.getByText('AT')).toBeInTheDocument()
	})

	it('renders no owner avatar when the lead has no owner', () => {
		render(
			<LeadDetailSheet
				lead={buildLead({ ownerName: null })}
				open={true}
				onOpenChange={vi.fn()}
			/>
		)
		expect(screen.queryByText('AT')).not.toBeInTheDocument()
	})
})

describe('LeadDetailSheet — CRM timeline', () => {
	it('shows the activity timeline on the Historial tab when the feature is on', async () => {
		const user = userEvent.setup()
		const { rerender } = render(
			<LeadDetailSheet lead={buildLead()} open={true} onOpenChange={vi.fn()} />
		)
		await user.click(screen.getByRole('tab', { name: 'Historial' }))
		expect(
			screen.getByText('La línea de tiempo de este lead no está disponible.')
		).toBeInTheDocument()
		expect(screen.queryByText('Timeline')).not.toBeInTheDocument()

		rerender(
			<LeadDetailSheet
				lead={buildLead()}
				open={true}
				onOpenChange={vi.fn()}
				timelineEnabled
			/>
		)
		await user.click(screen.getByRole('tab', { name: 'Historial' }))
		expect(screen.getByText('Timeline')).toBeInTheDocument()
	})

	it('puts tasks and cases in a tab inside Detalle, after the CRM section', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(() =>
				Promise.resolve({ ok: true, json: async () => ({ data: [] }) })
			)
		)
		const user = userEvent.setup()
		render(
			<LeadDetailSheet
				lead={buildLead()}
				open={true}
				onOpenChange={vi.fn()}
				tasksEnabled
				casesEnabled
				crmFieldsEnabled
			/>
		)
		expect(screen.getByRole('tab', { name: 'Detalle' })).toHaveAttribute(
			'data-state',
			'active'
		)
		const crm = screen.getByText('CRM fields read-only')
		const tasks = screen.getByRole('tab', { name: 'Tareas' })
		expect(
			crm.compareDocumentPosition(tasks) & Node.DOCUMENT_POSITION_FOLLOWING
		).toBeTruthy()
		expect(
			screen.queryByRole('heading', { name: 'Casos de soporte' })
		).not.toBeInTheDocument()

		await user.click(screen.getByRole('tab', { name: 'Casos' }))
		expect(
			screen.getByRole('heading', { name: 'Casos de soporte' })
		).toBeInTheDocument()
		expect(screen.getByRole('tab', { name: 'Detalle' })).toHaveAttribute(
			'data-state',
			'active'
		)
	})

	it('shows the activity description, a comment composer, and close when opened from an activity', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn((url: string) => {
				if (url.includes('activity-comments')) {
					return Promise.resolve({
						ok: true,
						json: async () => ({
							data: [
								{
									id: 3,
									body: 'Seguimiento',
									createdAt: '2026-11-12T15:00:00.000Z',
									authorName: 'Ana',
								},
							],
						}),
					})
				}
				return Promise.resolve({
					ok: true,
					json: async () => ({
						data: [
							{
								idLeadTask: 5,
								title: 'Llamar',
								type: 'CALL',
								dueAt: null,
								status: 'OPEN',
								assignedTo: 5,
								completedAt: null,
								assignee: { name: 'Ana', lastName: null },
							},
						],
					}),
				})
			})
		)
		render(
			<LeadDetailSheet
				lead={buildLead()}
				open={true}
				onOpenChange={vi.fn()}
				timelineEnabled
				tasksEnabled
				activityFocus={{ kind: 'task', id: 5 }}
			/>
		)
		expect(screen.queryByText('Timeline')).not.toBeInTheDocument()
		expect(screen.getByRole('tab', { name: 'Detalle' })).toHaveAttribute(
			'data-state',
			'active'
		)
		expect(await screen.findByText('Descripción')).toBeInTheDocument()
		expect(screen.getByText('Llamar')).toBeInTheDocument()
		expect(await screen.findByText('Seguimiento')).toBeInTheDocument()
		expect(
			screen.queryByRole('tab', { name: 'Tareas' })
		).not.toBeInTheDocument()
		expect(screen.queryByLabelText('Nueva tarea')).not.toBeInTheDocument()
		expect(screen.getByLabelText('Agregar comentario')).toBeInTheDocument()
		expect(
			screen.queryByRole('link', { name: 'Convertir a negocio' })
		).not.toBeInTheDocument()
		expect(
			screen.getByRole('button', { name: 'Finalizar actividad' })
		).toBeEnabled()
	})
})

describe('LeadDetailSheet — CRM fields', () => {
	it('renders the CRM fields section only behind crm_lead_fields, read-only without management rights', () => {
		const { rerender } = render(
			<LeadDetailSheet lead={buildLead()} open={true} onOpenChange={vi.fn()} />
		)
		expect(screen.queryByText(/CRM fields/)).not.toBeInTheDocument()
		rerender(
			<LeadDetailSheet
				lead={buildLead()}
				open={true}
				onOpenChange={vi.fn()}
				crmFieldsEnabled
			/>
		)
		expect(screen.getByText('CRM fields read-only')).toBeInTheDocument()
		rerender(
			<LeadDetailSheet
				lead={buildLead()}
				open={true}
				onOpenChange={vi.fn()}
				crmFieldsEnabled
				canManageCrm
			/>
		)
		expect(screen.getByText('CRM fields editable')).toBeInTheDocument()
	})
})

describe('LeadDetailSheet — GHL-managed indicator (crm-phase-0-foundation)', () => {
	it('shows "Gestionado en GHL" when the lead has an externalCrmId', () => {
		render(
			<LeadDetailSheet
				lead={buildLead({ externalCrmId: 'crm-1' })}
				open={true}
				onOpenChange={vi.fn()}
			/>
		)
		expect(screen.getByText('Gestionado en GHL')).toBeInTheDocument()
	})

	it.each([null, '  '])(
		'hides the indicator when externalCrmId is %j',
		(externalCrmId) => {
			render(
				<LeadDetailSheet
					lead={buildLead({ externalCrmId })}
					open={true}
					onOpenChange={vi.fn()}
				/>
			)
			expect(screen.queryByText('Gestionado en GHL')).not.toBeInTheDocument()
		}
	)
})

describe('LeadDetailSheet — conversion requires an owner', () => {
	it('renders "Convertir a negocio" as an active link when the lead has an owner', () => {
		render(
			<LeadDetailSheet
				lead={buildLead({ idUser: 5, idBusiness: null })}
				open={true}
				onOpenChange={vi.fn()}
				canManageCrm
			/>
		)
		const link = screen.getByText('Convertir a negocio').closest('a')
		expect(link).toHaveAttribute('href', '/dashboard/negocios/crear?leadId=1')
	})

	it('disables "Convertir a negocio" and shows an explanatory caption when the lead has no owner', () => {
		render(
			<LeadDetailSheet
				lead={buildLead({ idUser: null, idBusiness: null })}
				open={true}
				onOpenChange={vi.fn()}
				canManageCrm
			/>
		)
		const button = screen.getByRole('button', { name: 'Convertir a negocio' })
		expect(button).toBeDisabled()
		expect(screen.queryByText('Convertir a negocio')?.closest('a')).toBeNull()
		expect(screen.getByText(/asigna un owner/i)).toBeInTheDocument()
	})

	it('hides conversion for a read-only viewer', () => {
		render(
			<LeadDetailSheet
				lead={buildLead({ idUser: 5, idBusiness: null })}
				open={true}
				onOpenChange={vi.fn()}
			/>
		)
		expect(screen.queryByText('Convertir a negocio')).not.toBeInTheDocument()
	})
})

describe('LeadDetailSheet — admin delete', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockState = { status: 'idle', data: undefined, error: '' }
		advisorAccess.current = {
			state: { status: 'success', data: [], error: '' },
			canLead: false,
		}
	})

	it('hides the delete action for a non-admin', () => {
		render(
			<LeadDetailSheet
				lead={buildLead({ idBusiness: null, outcomeStatus: 'OPEN' })}
				open={true}
				onOpenChange={vi.fn()}
				isAdmin={false}
			/>
		)
		expect(
			screen.queryByRole('button', { name: /eliminar lead/i })
		).not.toBeInTheDocument()
	})

	it('hides the delete action for an admin viewing an ineligible (WON) lead', () => {
		render(
			<LeadDetailSheet
				lead={buildLead({ idBusiness: null, outcomeStatus: 'WON' })}
				open={true}
				onOpenChange={vi.fn()}
				isAdmin={true}
			/>
		)
		expect(
			screen.queryByRole('button', { name: /eliminar lead/i })
		).not.toBeInTheDocument()
	})

	it('shows the delete action for an admin viewing an eligible lead', () => {
		render(
			<LeadDetailSheet
				lead={buildLead({ idBusiness: null, outcomeStatus: 'OPEN' })}
				open={true}
				onOpenChange={vi.fn()}
				isAdmin={true}
			/>
		)
		expect(
			screen.getByRole('button', { name: /eliminar lead/i })
		).toBeInTheDocument()
	})

	it('opens a confirmation dialog on click without issuing the DELETE request', async () => {
		const user = userEvent.setup()
		render(
			<LeadDetailSheet
				lead={buildLead({ idBusiness: null, outcomeStatus: 'OPEN' })}
				open={true}
				onOpenChange={vi.fn()}
				isAdmin={true}
			/>
		)

		await user.click(screen.getByRole('button', { name: /eliminar lead/i }))

		expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
		expect(mockDeleteLead).not.toHaveBeenCalled()
	})

	it('confirming the dialog triggers the delete flow and calls onDeleted on success', async () => {
		const onDeleted = vi.fn()
		mockDeleteLead.mockImplementation(async () => {
			mockState = { status: 'success', data: { idLead: 1 }, error: '' }
		})
		const user = userEvent.setup()
		const { rerender } = render(
			<LeadDetailSheet
				lead={buildLead({ idLead: 1, idBusiness: null, outcomeStatus: 'OPEN' })}
				open={true}
				onOpenChange={vi.fn()}
				isAdmin={true}
				onDeleted={onDeleted}
			/>
		)

		await user.click(screen.getByRole('button', { name: /eliminar lead/i }))
		await screen.findByRole('alertdialog')
		await user.click(screen.getByRole('button', { name: /^confirmar$/i }))

		await waitFor(() => expect(mockDeleteLead).toHaveBeenCalledWith(1))

		rerender(
			<LeadDetailSheet
				lead={buildLead({ idLead: 1, idBusiness: null, outcomeStatus: 'OPEN' })}
				open={true}
				onOpenChange={vi.fn()}
				isAdmin={true}
				onDeleted={onDeleted}
			/>
		)

		await waitFor(() => expect(onDeleted).toHaveBeenCalled())
	})
})

describe('LeadDetailSheet — CRM conversion audit', () => {
	it('shows a read-only conversion audit link only when the flag is enabled and a business is linked', () => {
		render(
			<LeadDetailSheet
				lead={buildLead({ idBusiness: 42 })}
				open={true}
				onOpenChange={vi.fn()}
				conversionAuditEnabled
			/>
		)
		expect(screen.getByText('Ver auditoría de conversión')).toBeInTheDocument()
		expect(
			screen.getByText('Ver auditoría de conversión').closest('a')
		).toHaveAttribute('href', '/dashboard/negocios/42?crmAudit=1')
	})
})

it('switches the selected opportunity without changing attribution or business targets locally', () => {
	const capture = { idLeadCapture: 2, name: 'Programa', level: 2, status: true }
	const lead = buildLead({
		capture,
		referrerName: 'María',
		firstOriginTag: 'Evento',
		firstReferrerName: 'Luis',
		captures: [1, 2].map((idLead) => ({
			idLead,
			capture,
			referrerName: 'María',
			originTag: 'Propio',
			idLeadFunnelColumn: 1,
			outcomeStatus: 'OPEN',
			createdAt: '2026-11-24T00:00:00Z',
		})),
	})
	const onSelectLead = vi.fn()
	render(
		<LeadDetailSheet
			lead={lead}
			open
			onOpenChange={vi.fn()}
			onSelectLead={onSelectLead}
			canManageCrm
		/>
	)
	fireEvent.change(
		screen.getByRole('combobox', { name: 'Captura / oportunidad' }),
		{ target: { value: '2' } }
	)
	expect(onSelectLead).toHaveBeenCalledExactlyOnceWith(2)
	expect(screen.getByText('Captura: Programa')).toBeInTheDocument()
	expect(screen.getByText('Referido por: María')).toBeInTheDocument()
	expect(screen.getByText('Origen inicial: Evento')).toBeInTheDocument()
	expect(
		screen.getByRole('link', { name: 'Convertir a negocio' })
	).toHaveAttribute('href', '/dashboard/negocios/crear?leadId=1')
})
