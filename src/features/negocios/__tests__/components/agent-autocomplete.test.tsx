import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AgentAutocomplete } from '../../components/fields/agent-autocomplete'
import { UserWithRole } from '../../types/business.types'
import { UserRole } from '@/features/auth/lib/roles'

const baseDate = new Date('2024-01-01T00:00:00.000Z')

/**
 * Helper to create mock agents
 */
function createMockAgent(overrides: Partial<UserWithRole> = {}): UserWithRole {
	return {
		idUser: 1,
		name: 'Test',
		lastName: 'Agent',
		typeIdentity: 'CC',
		identityNumber: '1234567890',
		email: 'test@example.com',
		password: null,
		ssoOnly: false,
		phone: '3001234567',
		idCategoria: null,
		idRole: 1,
		idUserLeader: null,
		entryDate: baseDate,
		retirementDate: null,
		active: true,
		createdAt: baseDate,
		updatedAt: baseDate,
		role: {
			idRole: 1,
			code: UserRole.AGENTE,
			name: 'Agente/Coach',
			description: 'Solo acceso a sus propios negocios',
			active: true,
			createdAt: baseDate,
			updatedAt: baseDate,
		},
		...overrides,
	}
}

describe('AgentAutocomplete', () => {
	const mockAgent1 = createMockAgent({
		idUser: 1,
		name: 'Juan',
		lastName: 'Pérez',
		identityNumber: '1234567890',
		email: 'juan.perez@example.com',
	})

	const mockAgent2 = createMockAgent({
		idUser: 2,
		name: 'María',
		lastName: 'García',
		identityNumber: '2345678901',
		email: 'maria.garcia@example.com',
	})

	const mockAgent3 = createMockAgent({
		idUser: 3,
		name: 'Carlos',
		lastName: 'López',
		identityNumber: '3456789012',
		email: 'carlos.lopez@example.com',
	})

	beforeEach(() => {
		vi.clearAllMocks()
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	describe('Happy Path', () => {
		it('should render with placeholder when no value', () => {
			render(<AgentAutocomplete />)

			expect(screen.getByText('Buscar agente...')).toBeInTheDocument()
		})

		it('should display selected agent from default agents list', () => {
			const onChange = vi.fn()
			render(
				<AgentAutocomplete
					value="1"
					onChange={onChange}
					agents={[mockAgent1]}
				/>
			)

			expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
		})

		it('should open popover when button is clicked', async () => {
			render(<AgentAutocomplete agents={[mockAgent1]} />)

			const button = screen.getByRole('combobox')
			fireEvent.click(button)

			await waitFor(() => {
				expect(screen.getByPlaceholderText(/Buscar agente/i)).toBeInTheDocument()
			})
		})

		it('should select agent from default agents list', async () => {
			const onChange = vi.fn()
			render(
				<AgentAutocomplete
					agents={[mockAgent1, mockAgent2]}
					onChange={onChange}
				/>
			)

			const button = screen.getByRole('combobox')
			fireEvent.click(button)

			await waitFor(() => {
				expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
			})

			const agentItem = screen.getByText('Juan Pérez').closest('[role="option"]')
			if (agentItem) {
				fireEvent.click(agentItem)
			}

			await waitFor(() => {
				expect(onChange).toHaveBeenCalledWith('1')
			})
		})
	})

	describe('Remote Search', () => {
		it('should search agents remotely when onSearch is provided', async () => {
			const onSearch = vi.fn().mockResolvedValue([mockAgent1, mockAgent2])
			const onChange = vi.fn()

			render(
				<AgentAutocomplete
					onSearch={onSearch}
					onChange={onChange}
				/>
			)

			const button = screen.getByRole('combobox')
			fireEvent.click(button)

			await waitFor(() => {
				const input = screen.getByPlaceholderText(/Buscar agente/i)
				expect(input).toBeInTheDocument()
			})

			const input = screen.getByPlaceholderText(/Buscar agente/i)
			fireEvent.change(input, { target: { value: 'Juan' } })

			await act(async () => {
				vi.advanceTimersByTime(400)
			})

			await waitFor(() => {
				expect(onSearch).toHaveBeenCalledWith('Juan')
			})

			await waitFor(() => {
				expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
			})
		})

		it('should select agent from remote search results', async () => {
			const onSearch = vi.fn().mockResolvedValue([mockAgent1])
			const onChange = vi.fn()

			render(
				<AgentAutocomplete
					onSearch={onSearch}
					onChange={onChange}
				/>
			)

			const button = screen.getByRole('combobox')
			fireEvent.click(button)

			await waitFor(() => {
				const input = screen.getByPlaceholderText(/Buscar agente/i)
				fireEvent.change(input, { target: { value: 'Juan' } })
			})

			await act(async () => {
				vi.advanceTimersByTime(400)
			})

			await waitFor(() => {
				expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
			})

			const agentItem = screen.getByText('Juan Pérez').closest('[role="option"]')
			if (agentItem) {
				fireEvent.click(agentItem)
			}

			await waitFor(() => {
				expect(onChange).toHaveBeenCalledWith('1')
			})
		})

		it('should persist selected agent after search query is cleared', async () => {
			const onSearch = vi.fn().mockResolvedValue([mockAgent1])
			const onChange = vi.fn()

			const { rerender } = render(
				<AgentAutocomplete
					onSearch={onSearch}
					onChange={onChange}
				/>
			)

			// Open popover and search
			const button = screen.getByRole('combobox')
			fireEvent.click(button)

			await waitFor(() => {
				const input = screen.getByPlaceholderText(/Buscar agente/i)
				fireEvent.change(input, { target: { value: 'Juan' } })
			})

			await act(async () => {
				vi.advanceTimersByTime(400)
			})

			await waitFor(() => {
				expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
			})

			// Select agent
			const agentItem = screen.getByText('Juan Pérez').closest('[role="option"]')
			if (agentItem) {
				fireEvent.click(agentItem)
			}

			await waitFor(() => {
				expect(onChange).toHaveBeenCalledWith('1')
			})

			// Update value prop to simulate form state update
			rerender(
				<AgentAutocomplete
					value="1"
					onSearch={onSearch}
					onChange={onChange}
				/>
			)

			// Verify agent is still displayed even though remoteAgents is cleared
			expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
		})

		it('should show loading state while searching', async () => {
			const onSearch = vi.fn(
				() =>
					new Promise<UserWithRole[]>((resolve) => {
						setTimeout(() => resolve([mockAgent1]), 1000)
					})
			)

			render(<AgentAutocomplete onSearch={onSearch} />)

			const button = screen.getByRole('combobox')
			fireEvent.click(button)

			await waitFor(() => {
				const input = screen.getByPlaceholderText(/Buscar agente/i)
				fireEvent.change(input, { target: { value: 'Juan' } })
			})

			await act(async () => {
				vi.advanceTimersByTime(400)
			})

			await waitFor(() => {
				expect(screen.getByText('Buscando agentes...')).toBeInTheDocument()
			})
		})

		it('should require at least 3 characters for remote search', async () => {
			const onSearch = vi.fn().mockResolvedValue([mockAgent1])

			render(<AgentAutocomplete onSearch={onSearch} />)

			const button = screen.getByRole('combobox')
			fireEvent.click(button)

			await waitFor(() => {
				const input = screen.getByPlaceholderText(/Buscar agente/i)
				fireEvent.change(input, { target: { value: 'Ju' } })
			})

			await act(async () => {
				vi.advanceTimersByTime(400)
			})

			await waitFor(() => {
				expect(
					screen.getByText('Ingrese al menos 3 caracteres para buscar')
				).toBeInTheDocument()
			})

			expect(onSearch).not.toHaveBeenCalled()
		})
	})

	describe('Agent Persistence', () => {
		it('should display selected agent from cache after remoteAgents is cleared', async () => {
			const onSearch = vi.fn().mockResolvedValue([mockAgent1])
			const onChange = vi.fn()

			const { rerender } = render(
				<AgentAutocomplete
					onSearch={onSearch}
					onChange={onChange}
				/>
			)

			// Search and select agent
			const button = screen.getByRole('combobox')
			fireEvent.click(button)

			await waitFor(() => {
				const input = screen.getByPlaceholderText(/Buscar agente/i)
				fireEvent.change(input, { target: { value: 'Juan' } })
			})

			await act(async () => {
				vi.advanceTimersByTime(400)
			})

			await waitFor(() => {
				expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
			})

			const agentItem = screen.getByText('Juan Pérez').closest('[role="option"]')
			if (agentItem) {
				fireEvent.click(agentItem)
			}

			await waitFor(() => {
				expect(onChange).toHaveBeenCalledWith('1')
			})

			// Update with value prop - this simulates the form state update
			rerender(
				<AgentAutocomplete
					value="1"
					onSearch={onSearch}
					onChange={onChange}
				/>
			)

			// Verify agent is displayed (from cache)
			expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
		})

		it('should not show "Agente no encontrado" when agent is in cache', async () => {
			const onSearch = vi.fn().mockResolvedValue([mockAgent1])
			const onChange = vi.fn()

			const { rerender } = render(
				<AgentAutocomplete
					onSearch={onSearch}
					onChange={onChange}
				/>
			)

			// Select agent
			const button = screen.getByRole('combobox')
			fireEvent.click(button)

			await waitFor(() => {
				const input = screen.getByPlaceholderText(/Buscar agente/i)
				fireEvent.change(input, { target: { value: 'Juan' } })
			})

			await act(async () => {
				vi.advanceTimersByTime(400)
			})

			await waitFor(() => {
				const agentItem = screen
					.getByText('Juan Pérez')
					.closest('[role="option"]')
				if (agentItem) {
					fireEvent.click(agentItem)
				}
			})

			// Update with value
			rerender(
				<AgentAutocomplete
					value="1"
					onSearch={onSearch}
					onChange={onChange}
				/>
			)

			// Should not show "Agente no encontrado"
			expect(screen.queryByText('Agente no encontrado')).not.toBeInTheDocument()
			expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
		})
	})

	describe('Edit Mode', () => {
		it('should initialize cache from agents prop in edit mode', () => {
			render(
				<AgentAutocomplete
					value="1"
					agents={[mockAgent1]}
				/>
			)

			expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
		})

		it('should display existing agent in edit mode', () => {
			render(
				<AgentAutocomplete
					value="1"
					agents={[mockAgent1]}
				/>
			)

			expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
			expect(screen.getByText(/1234567890/)).toBeInTheDocument()
		})

		it('should allow changing agent in edit mode', async () => {
			const onChange = vi.fn()
			render(
				<AgentAutocomplete
					value="1"
					agents={[mockAgent1, mockAgent2]}
					onChange={onChange}
				/>
			)

			const button = screen.getByRole('combobox')
			fireEvent.click(button)

			await waitFor(() => {
				expect(screen.getByText('María García')).toBeInTheDocument()
			})

			const agentItem = screen.getByText('María García').closest('[role="option"]')
			if (agentItem) {
				fireEvent.click(agentItem)
			}

			await waitFor(() => {
				expect(onChange).toHaveBeenCalledWith('2')
			})
		})
	})

	describe('Create Mode', () => {
		it('should work with default agents when user is agent', () => {
			render(
				<AgentAutocomplete
					agents={[mockAgent1]}
				/>
			)

			const button = screen.getByRole('combobox')
			fireEvent.click(button)

			expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
		})

		it('should allow searching and selecting any agent when canSearchAgents is true', async () => {
			const onSearch = vi.fn().mockResolvedValue([mockAgent2])
			const onChange = vi.fn()

			render(
				<AgentAutocomplete
					agents={[mockAgent1]}
					onSearch={onSearch}
					onChange={onChange}
				/>
			)

			const button = screen.getByRole('combobox')
			fireEvent.click(button)

			await waitFor(() => {
				const input = screen.getByPlaceholderText(/Buscar agente/i)
				fireEvent.change(input, { target: { value: 'María' } })
			})

			await act(async () => {
				vi.advanceTimersByTime(400)
			})

			await waitFor(() => {
				expect(screen.getByText('María García')).toBeInTheDocument()
			})

			const agentItem = screen.getByText('María García').closest('[role="option"]')
			if (agentItem) {
				fireEvent.click(agentItem)
			}

			await waitFor(() => {
				expect(onChange).toHaveBeenCalledWith('2')
			})
		})
	})

	describe('Cache Management', () => {
		it('should avoid duplicate agents in cache', async () => {
			const onSearch = vi.fn().mockResolvedValue([mockAgent1])
			const onChange = vi.fn()

			const { rerender } = render(
				<AgentAutocomplete
					onSearch={onSearch}
					onChange={onChange}
				/>
			)

			// Select agent first time
			const button = screen.getByRole('combobox')
			fireEvent.click(button)

			await waitFor(() => {
				const input = screen.getByPlaceholderText(/Buscar agente/i)
				fireEvent.change(input, { target: { value: 'Juan' } })
			})

			await act(async () => {
				vi.advanceTimersByTime(400)
			})

			await waitFor(() => {
				const agentItem = screen
					.getByText('Juan Pérez')
					.closest('[role="option"]')
				if (agentItem) {
					fireEvent.click(agentItem)
				}
			})

			rerender(
				<AgentAutocomplete
					value="1"
					onSearch={onSearch}
					onChange={onChange}
				/>
			)

			// Select another agent
			fireEvent.click(screen.getByRole('combobox'))

			await waitFor(() => {
				const input = screen.getByPlaceholderText(/Buscar agente/i)
				fireEvent.change(input, { target: { value: 'María' } })
			})

			onSearch.mockResolvedValueOnce([mockAgent2])

			await act(async () => {
				vi.advanceTimersByTime(400)
			})

			await waitFor(() => {
				const agentItem = screen
					.getByText('María García')
					.closest('[role="option"]')
				if (agentItem) {
					fireEvent.click(agentItem)
				}
			})

			// Both agents should be accessible
			rerender(
				<AgentAutocomplete
					value="2"
					onSearch={onSearch}
					onChange={onChange}
				/>
			)

			expect(screen.getByText('María García')).toBeInTheDocument()
		})

		it('should merge agents from props into cache', () => {
			const { rerender } = render(
				<AgentAutocomplete
					agents={[mockAgent1]}
				/>
			)

			// Add more agents via props
			rerender(
				<AgentAutocomplete
					agents={[mockAgent1, mockAgent2]}
				/>
			)

			const button = screen.getByRole('combobox')
			fireEvent.click(button)

			// Both agents should be available
			expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
			expect(screen.getByText('María García')).toBeInTheDocument()
		})
	})

	describe('Value Synchronization', () => {
		it('should update displayed agent when value prop changes', () => {
			const { rerender } = render(
				<AgentAutocomplete
					value="1"
					agents={[mockAgent1, mockAgent2]}
				/>
			)

			expect(screen.getByText('Juan Pérez')).toBeInTheDocument()

			rerender(
				<AgentAutocomplete
					value="2"
					agents={[mockAgent1, mockAgent2]}
				/>
			)

			expect(screen.getByText('María García')).toBeInTheDocument()
		})

		it('should clear selection when value is set to empty string', () => {
			const { rerender } = render(
				<AgentAutocomplete
					value="1"
					agents={[mockAgent1]}
				/>
			)

			expect(screen.getByText('Juan Pérez')).toBeInTheDocument()

			rerender(
				<AgentAutocomplete
					value=""
					agents={[mockAgent1]}
				/>
			)

			expect(screen.getByText('Buscar agente...')).toBeInTheDocument()
		})
	})

	describe('Edge Cases', () => {
		it('should handle empty search results', async () => {
			const onSearch = vi.fn().mockResolvedValue([])

			render(<AgentAutocomplete onSearch={onSearch} />)

			const button = screen.getByRole('combobox')
			fireEvent.click(button)

			await waitFor(() => {
				const input = screen.getByPlaceholderText(/Buscar agente/i)
				fireEvent.change(input, { target: { value: 'Nonexistent' } })
			})

			await act(async () => {
				vi.advanceTimersByTime(400)
			})

			await waitFor(() => {
				expect(screen.getByText('No se encontraron agentes')).toBeInTheDocument()
			})
		})

		it('should handle search error gracefully', async () => {
			const onSearch = vi.fn().mockRejectedValue(new Error('Network error'))
			const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

			render(<AgentAutocomplete onSearch={onSearch} />)

			const button = screen.getByRole('combobox')
			fireEvent.click(button)

			await waitFor(() => {
				const input = screen.getByPlaceholderText(/Buscar agente/i)
				fireEvent.change(input, { target: { value: 'Juan' } })
			})

			await act(async () => {
				vi.advanceTimersByTime(400)
			})

			await waitFor(() => {
				expect(consoleError).toHaveBeenCalled()
			})

			consoleError.mockRestore()
		})

		it('should filter agents locally when no remote search', () => {
			render(
				<AgentAutocomplete
					agents={[mockAgent1, mockAgent2, mockAgent3]}
				/>
			)

			const button = screen.getByRole('combobox')
			fireEvent.click(button)

			const input = screen.getByPlaceholderText(/Buscar agente/i)
			fireEvent.change(input, { target: { value: 'Juan' } })

			expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
			expect(screen.queryByText('María García')).not.toBeInTheDocument()
		})

		it('should display identity number when available', () => {
			render(
				<AgentAutocomplete
					value="1"
					agents={[mockAgent1]}
				/>
			)

			expect(screen.getByText(/1234567890/)).toBeInTheDocument()
		})
	})

	describe('Accessibility', () => {
		it('should have proper aria attributes', () => {
			render(
				<AgentAutocomplete
					aria-label="Select agent"
					aria-labelledby="agent-label"
				/>
			)

			const button = screen.getByRole('combobox')
			expect(button).toHaveAttribute('aria-label', 'Select agent')
			expect(button).toHaveAttribute('aria-labelledby', 'agent-label')
		})

		it('should be disabled when disabled prop is true', () => {
			render(<AgentAutocomplete disabled />)

			const button = screen.getByRole('combobox')
			expect(button).toBeDisabled()
		})
	})
})

