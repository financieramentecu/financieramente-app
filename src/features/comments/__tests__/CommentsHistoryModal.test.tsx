import { useRef, useState } from 'react'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ROLE_NAMES, UserRole } from '@/features/auth/lib/roles'

vi.mock('../lib/comments-api', () => ({
  commentsApi: {
    list: vi.fn(),
    create: vi.fn(),
  },
}))

class FakeEventSource {
  static instances: FakeEventSource[] = []
  listeners: Record<string, ((e: MessageEvent) => void)[]> = {}
  onerror: (() => void) | null = null
  close = vi.fn()

  constructor(public url: string) {
    FakeEventSource.instances.push(this)
  }

  addEventListener(event: string, cb: (e: MessageEvent) => void) {
    this.listeners[event] = [...(this.listeners[event] ?? []), cb]
  }

  emit(event: string, data: unknown) {
    this.emitRaw(event, JSON.stringify(data))
  }

  emitRaw(event: string, raw: string) {
    for (const cb of this.listeners[event] ?? []) {
      cb({ data: raw } as MessageEvent)
    }
  }
}

// @ts-expect-error — test stub, not a full EventSource implementation
global.EventSource = FakeEventSource

import { CommentsHistoryModal } from '../components/CommentsHistoryModal'
import { commentsApi } from '../lib/comments-api'
import type { CommentDTO } from '../types/comment.types'

const mockList = vi.mocked(commentsApi.list)

/** Intl may emit U+00A0 / U+202F between date parts; normalize to a plain space. */
function normalize(value: string): string {
  return value.replace(/[\u00A0\u202F]/g, ' ')
}

// 2026-09-30T02:30:00Z is 2026-09-29 21:30 in Bogotá (UTC-5)
const BOGOTA_INSTANT = '2026-09-30T02:30:00.000Z'
// CLDR versions differ: es-CO "medium" is "29/09/2026" or "29 sept 2026"
const BOGOTA_DATE = /29(\/09\/| sept?\.? )2026/
const BOGOTA_TIME = /9:30\s?p\.\s?m\./

const CONTRACT = 'CT-2026-0042'
const TITLE = `Comentarios — ${CONTRACT}`
const EMPTY_MESSAGE = 'Todavía no hay comentarios en este contrato.'

function buildComment(overrides: Partial<CommentDTO> = {}): CommentDTO {
  return {
    id: 'c1',
    businessId: 10,
    title: 'Falta soporte',
    detail: 'Se solicita comprobante del pago',
    author: { id: 2, name: 'Ana Pérez', role: UserRole.ANALISTA_SOPORTE },
    createdAt: '2026-07-01T10:00:00.000Z',
    ...overrides,
  }
}

/** A promise whose resolution the test controls, to observe the loading state. */
function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

beforeEach(() => {
  FakeEventSource.instances = []
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('CommentsHistoryModal content and data states', () => {
  it('lists all comments oldest first', async () => {
    mockList.mockResolvedValue([
      buildComment({ id: 'c1', createdAt: '2026-07-01T10:00:00.000Z' }),
      buildComment({ id: 'c2', createdAt: '2026-07-02T10:00:00.000Z' }),
      buildComment({ id: 'c3', createdAt: '2026-07-03T10:00:00.000Z' }),
    ])
    render(<CommentsHistoryModal businessId={10} contract={CONTRACT} open onClose={vi.fn()} />)

    const items = await screen.findAllByTestId(/comment-item-/)
    expect(items.map((item) => item.getAttribute('data-testid'))).toEqual([
      'comment-item-c1',
      'comment-item-c2',
      'comment-item-c3',
    ])
  })

  it('displays author, role label, title, detail and Bogota date and time', async () => {
    mockList.mockResolvedValue([buildComment({ createdAt: BOGOTA_INSTANT })])
    render(<CommentsHistoryModal businessId={10} contract={CONTRACT} open onClose={vi.fn()} />)

    const item = await screen.findByTestId('comment-item-c1')
    const text = normalize(item.textContent ?? '')
    expect(text).toContain('Ana Pérez')
    expect(text).toContain(ROLE_NAMES[UserRole.ANALISTA_SOPORTE])
    expect(text).toContain('Falta soporte')
    expect(text).toContain('Se solicita comprobante del pago')
    expect(text).toMatch(BOGOTA_DATE)
    expect(text).toMatch(BOGOTA_TIME)
  })

  it('shows the Bogota time even when the runtime timezone is different', async () => {
    vi.stubEnv('TZ', 'Asia/Tokyo')
    mockList.mockResolvedValue([buildComment({ createdAt: BOGOTA_INSTANT })])
    render(<CommentsHistoryModal businessId={10} contract={CONTRACT} open onClose={vi.fn()} />)

    const item = await screen.findByTestId('comment-item-c1')
    expect(normalize(item.textContent ?? '')).toMatch(BOGOTA_TIME)
  })

  it('uses the contract number in the title', async () => {
    mockList.mockResolvedValue([])
    render(<CommentsHistoryModal businessId={10} contract={CONTRACT} open onClose={vi.fn()} />)

    expect(await screen.findByRole('heading', { name: TITLE })).toBeInTheDocument()
  })

  it.each([
    ['null', null],
    ['an empty string', ''],
  ])('shows just "Comentarios" as the title when the contract is %s', async (_label, contract) => {
    mockList.mockResolvedValue([])
    render(<CommentsHistoryModal businessId={10} contract={contract} open onClose={vi.fn()} />)

    const heading = await screen.findByRole('heading', { name: 'Comentarios' })
    expect(heading.textContent).toBe('Comentarios')
    expect(heading.textContent).not.toContain('—')
    expect(heading.textContent).not.toContain('10')
  })

  it('shows the loading state with no entries and no empty message', () => {
    mockList.mockReturnValue(new Promise(() => {}))
    render(<CommentsHistoryModal businessId={10} contract={CONTRACT} open onClose={vi.fn()} />)

    expect(screen.getByText('Cargando comentarios…')).toBeInTheDocument()
    expect(screen.queryAllByTestId(/comment-item-/)).toHaveLength(0)
    expect(screen.queryByText(EMPTY_MESSAGE)).not.toBeInTheDocument()
  })

  it('shows the error message and a retry control with no entries', async () => {
    mockList.mockRejectedValue(new Error('Error al cargar comentarios'))
    render(<CommentsHistoryModal businessId={10} contract={CONTRACT} open onClose={vi.fn()} />)

    expect(await screen.findByText('Error al cargar comentarios')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
    expect(screen.queryAllByTestId(/comment-item-/)).toHaveLength(0)
  })

  it('goes back to loading and then shows the comments after Reintentar', async () => {
    const user = userEvent.setup()
    const retry = createDeferred<CommentDTO[]>()
    mockList
      .mockRejectedValueOnce(new Error('Error al cargar comentarios'))
      .mockReturnValueOnce(retry.promise)
    render(<CommentsHistoryModal businessId={10} contract={CONTRACT} open onClose={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'Reintentar' }))
    expect(screen.getByText('Cargando comentarios…')).toBeInTheDocument()

    retry.resolve([buildComment({ id: 'c1' }), buildComment({ id: 'c2' })])
    expect(await screen.findAllByTestId(/comment-item-/)).toHaveLength(2)
    expect(mockList).toHaveBeenCalledTimes(2)
  })

  it('shows the empty message when the list is empty', async () => {
    mockList.mockResolvedValue([])
    render(<CommentsHistoryModal businessId={10} contract={CONTRACT} open onClose={vi.fn()} />)

    expect(await screen.findByText(EMPTY_MESSAGE)).toBeInTheDocument()
    expect(screen.queryAllByTestId(/comment-item-/)).toHaveLength(0)
  })

  it('is read-only: no input, no submit and no edit or delete controls', async () => {
    mockList.mockResolvedValue([buildComment()])
    render(<CommentsHistoryModal businessId={10} contract={CONTRACT} open onClose={vi.fn()} />)
    await screen.findByTestId('comment-item-c1')

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /guardar/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /editar|eliminar|borrar|edit|delete/i })).not.toBeInTheDocument()
  })

  it('requests the comments exactly once on mount, for the given business', async () => {
    mockList.mockResolvedValue([buildComment()])
    render(<CommentsHistoryModal businessId={10} contract={CONTRACT} open onClose={vi.fn()} />)
    await screen.findByTestId('comment-item-c1')

    expect(mockList).toHaveBeenCalledTimes(1)
    expect(mockList).toHaveBeenCalledWith(10)
  })

  it('wraps a long unbroken detail inside the dialog', async () => {
    const longDetail = 'x'.repeat(200)
    mockList.mockResolvedValue([buildComment({ detail: longDetail })])
    render(<CommentsHistoryModal businessId={10} contract={CONTRACT} open onClose={vi.fn()} />)

    // LinkifiedText wraps the text in an inner element; the wrapping class sits on its paragraph
    const detailParagraph = (await screen.findByText(longDetail)).closest('p')
    expect(detailParagraph).toHaveClass('break-words')
  })

  it('applies the structural classes that bound the height and scroll the body', async () => {
    mockList.mockResolvedValue([buildComment()])
    render(<CommentsHistoryModal businessId={10} contract={CONTRACT} open onClose={vi.fn()} />)
    await screen.findByTestId('comment-item-c1')

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveClass('max-h-[85vh]')
    const body = within(dialog).getByTestId('comments-history-body')
    expect(body).toHaveClass('overflow-y-auto')
    expect(body).toHaveClass('min-h-0')
  })
})

interface HarnessProps {
  onClose?: () => void
}

/** Mimics BusinessRowActions: an external trigger and a dialog mounted only while open. */
function ModalHarness({ onClose }: HarnessProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  return (
    <>
      <button ref={triggerRef} type="button" onClick={() => setOpen(true)}>
        Abrir historial
      </button>
      {open && (
        <CommentsHistoryModal
          businessId={10}
          contract={CONTRACT}
          open={open}
          onClose={() => {
            onClose?.()
            setOpen(false)
          }}
          returnFocusRef={triggerRef}
        />
      )}
    </>
  )
}

describe('CommentsHistoryModal lifecycle, focus and resources', () => {
  it('opens as a dialog whose accessible name equals the title', async () => {
    const user = userEvent.setup()
    mockList.mockResolvedValue([buildComment()])
    render(<ModalHarness />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Abrir historial' }))

    expect(await screen.findByRole('dialog', { name: TITLE })).toBeInTheDocument()
  })

  it('closes with the Cerrar control', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    mockList.mockResolvedValue([buildComment()])
    render(<ModalHarness onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: 'Abrir historial' }))

    await user.click(await screen.findByRole('button', { name: 'Cerrar' }))

    expect(onClose).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('closes with the Escape key', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    mockList.mockResolvedValue([buildComment()])
    render(<ModalHarness onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: 'Abrir historial' }))
    await screen.findByRole('dialog')

    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('closes with a click on the overlay outside the dialog', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    mockList.mockResolvedValue([buildComment()])
    render(<ModalHarness onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: 'Abrir historial' }))
    await screen.findByRole('dialog')

    const overlay = document.querySelector<HTMLElement>('.bg-black\\/80')
    expect(overlay).not.toBeNull()
    await user.click(overlay as HTMLElement)

    expect(onClose).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('moves focus into the dialog on open', async () => {
    const user = userEvent.setup()
    mockList.mockResolvedValue([buildComment()])
    render(<ModalHarness />)
    await user.click(screen.getByRole('button', { name: 'Abrir historial' }))

    const dialog = await screen.findByRole('dialog')
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))
  })

  it.each([
    ['the Cerrar control', async (user: ReturnType<typeof userEvent.setup>) => {
      await user.click(await screen.findByRole('button', { name: 'Cerrar' }))
    }],
    ['the Escape key', async (user: ReturnType<typeof userEvent.setup>) => {
      await user.keyboard('{Escape}')
    }],
  ])('returns focus to the trigger after closing with %s', async (_label, close) => {
    const user = userEvent.setup()
    mockList.mockResolvedValue([buildComment()])
    render(<ModalHarness />)
    const trigger = screen.getByRole('button', { name: 'Abrir historial' })
    await user.click(trigger)
    await screen.findByRole('dialog')

    await close(user)

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it('closes the EventSource when the modal closes', async () => {
    const user = userEvent.setup()
    mockList.mockResolvedValue([buildComment()])
    render(<ModalHarness />)
    await user.click(screen.getByRole('button', { name: 'Abrir historial' }))
    await screen.findByTestId('comment-item-c1')

    expect(FakeEventSource.instances).toHaveLength(1)
    expect(FakeEventSource.instances[0].close).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Cerrar' }))

    await waitFor(() => expect(FakeEventSource.instances[0].close).toHaveBeenCalled())
  })

  it('fetches fresh data every time it is reopened', async () => {
    const user = userEvent.setup()
    mockList
      .mockResolvedValueOnce([buildComment({ id: 'c1' })])
      .mockResolvedValueOnce([buildComment({ id: 'c1' }), buildComment({ id: 'c2' })])
    render(<ModalHarness />)
    const trigger = screen.getByRole('button', { name: 'Abrir historial' })

    await user.click(trigger)
    await screen.findByTestId('comment-item-c1')
    await user.click(screen.getByRole('button', { name: 'Cerrar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    await user.click(trigger)

    expect(await screen.findByTestId('comment-item-c2')).toBeInTheDocument()
    expect(mockList).toHaveBeenCalledTimes(2)
  })
})

describe('CommentsHistoryModal live append (guard tests: behavior comes from useComments)', () => {
  async function renderLoadedModal() {
    mockList.mockResolvedValue([buildComment({ id: 'c1' }), buildComment({ id: 'c2' })])
    const view = render(
      <CommentsHistoryModal businessId={10} contract={CONTRACT} open onClose={vi.fn()} />,
    )
    await screen.findAllByTestId(/comment-item-/)
    return view
  }

  it('appends a comment-added event for the same business at the end', async () => {
    await renderLoadedModal()

    act(() => {
      FakeEventSource.instances[0].emit('comment-added', buildComment({ id: 'c3', businessId: 10 }))
    })

    const items = await screen.findAllByTestId(/comment-item-/)
    expect(items.map((item) => item.getAttribute('data-testid'))).toEqual([
      'comment-item-c1',
      'comment-item-c2',
      'comment-item-c3',
    ])
  })

  it('ignores an event for another business', async () => {
    await renderLoadedModal()

    act(() => {
      FakeEventSource.instances[0].emit('comment-added', buildComment({ id: 'c9', businessId: 11 }))
    })

    expect(screen.getAllByTestId(/comment-item-/)).toHaveLength(2)
    expect(screen.queryByTestId('comment-item-c9')).not.toBeInTheDocument()
  })

  it('does not duplicate a comment that is already listed', async () => {
    await renderLoadedModal()

    act(() => {
      FakeEventSource.instances[0].emit('comment-added', buildComment({ id: 'c1', businessId: 10 }))
    })

    expect(screen.getAllByTestId('comment-item-c1')).toHaveLength(1)
    expect(screen.getAllByTestId(/comment-item-/)).toHaveLength(2)
  })

  it('keeps the list and stays functional after a malformed event', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      await renderLoadedModal()

      act(() => {
        FakeEventSource.instances[0].emitRaw('comment-added', '{not valid json')
      })
      expect(screen.getAllByTestId(/comment-item-/)).toHaveLength(2)

      // A valid event afterwards is still appended: the subscription survived
      act(() => {
        FakeEventSource.instances[0].emit('comment-added', buildComment({ id: 'c3', businessId: 10 }))
      })
      expect(await screen.findByTestId('comment-item-c3')).toBeInTheDocument()
    } finally {
      errorSpy.mockRestore()
    }
  })

  it('causes no state update and no console error for events after unmounting', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const { unmount } = await renderLoadedModal()
      const source = FakeEventSource.instances[0]
      unmount()
      expect(source.close).toHaveBeenCalled()

      act(() => {
        source.emit('comment-added', buildComment({ id: 'c3', businessId: 10 }))
      })

      expect(errorSpy).not.toHaveBeenCalled()
    } finally {
      errorSpy.mockRestore()
    }
  })
})
