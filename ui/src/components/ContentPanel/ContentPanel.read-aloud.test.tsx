import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { forwardRef, useImperativeHandle } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ContentPanel from './ContentPanel'

vi.mock('../../services/api', () => ({
  api: { getFile: vi.fn(), getTree: vi.fn(), getReadme: vi.fn() },
}))

vi.mock('./CodeViewer', () => ({
  default: ({ content }: { content: string }) => <pre data-testid="code-viewer">{content}</pre>,
}))

const bar = vi.hoisted(() => ({ togglePause: vi.fn(), props: null as null | Record<string, unknown> }))
vi.mock('../ReadAloud/ReadAloudBar', () => ({
  default: forwardRef(function MockBar(props: Record<string, unknown>, ref) {
    bar.props = props
    useImperativeHandle(ref, () => ({ togglePause: bar.togglePause }))
    return (
      <section aria-label="Read aloud">
        <button type="button" onClick={props.onClose as () => void}>Close bar</button>
        <span data-testid="root-tag">{(props.getRoot as () => HTMLElement | null)()?.tagName}</span>
        <span data-testid="selection">{(props.selection as Range | null)?.toString() ?? 'none'}</span>
      </section>
    )
  }),
}))

const unlockAudio = vi.hoisted(() => vi.fn())
vi.mock('../ReadAloud/engines', () => ({ unlockAudio }))

import { api } from '../../services/api'

function renderPanel(path = 'notes.txt', file: Partial<Awaited<ReturnType<typeof api.getFile>>> = {}) {
  vi.mocked(api.getFile).mockResolvedValue({
    path,
    type: 'text',
    content: 'Hello there.',
    language: '',
    encoding: 'utf-8',
    editable: true,
    revisionToken: 'rev',
    ...file,
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const ui = (selectedPath: string) => (
    <QueryClientProvider client={client}>
      <ContentPanel canMutateFiles={false} refreshToken={0} selectedPath={selectedPath} selectedPathType="file" branch="main" onNavigate={vi.fn()} onOpenPath={vi.fn()} />
    </QueryClientProvider>
  )
  const utils = render(ui(path))
  return { ...utils, rerenderPath: (next: string) => utils.rerender(ui(next)) }
}

const nativeCommand = (command: string) => act(() => {
  window.dispatchEvent(new CustomEvent('gitlocal:native-command', { detail: { command } }))
})

describe('ContentPanel read aloud', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.getTree).mockResolvedValue([])
  })

  it('starts and stops from the header button', async () => {
    renderPanel()
    const button = await screen.findByRole('button', { name: 'Read aloud' })
    fireEvent.click(button)
    expect(unlockAudio).toHaveBeenCalled()
    expect(await screen.findByRole('region', { name: 'Read aloud' })).toBeInTheDocument()
    expect(screen.getByTestId('root-tag')).toHaveTextContent('DIV')
    expect(screen.getByTestId('selection')).toHaveTextContent('none')
    expect(bar.props?.options).toEqual({ type: 'text', language: '', content: 'Hello there.', showRaw: false })
    fireEvent.click(screen.getByRole('button', { name: 'Stop reading' }))
    expect(screen.queryByRole('region', { name: 'Read aloud' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Read aloud' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Close bar' }))
    expect(screen.queryByRole('region', { name: 'Read aloud' })).toBeNull()
  })

  it('captures a selection inside the preview', async () => {
    renderPanel()
    const viewer = await screen.findByTestId('code-viewer')
    const range = document.createRange()
    range.selectNodeContents(viewer)
    document.getSelection()!.removeAllRanges()
    document.getSelection()!.addRange(range)
    fireEvent.click(screen.getByRole('button', { name: 'Read aloud' }))
    expect(await screen.findByTestId('selection')).toHaveTextContent('Hello there.')
    document.getSelection()!.removeAllRanges()
  })

  it('toggles with Ctrl+Alt+S and stops with Escape', async () => {
    renderPanel()
    await screen.findByRole('button', { name: 'Read aloud' })
    fireEvent.keyDown(window, { code: 'KeyS', ctrlKey: true, altKey: true })
    expect(await screen.findByRole('region', { name: 'Read aloud' })).toBeInTheDocument()
    fireEvent.keyDown(window, { code: 'KeyS', ctrlKey: true, altKey: true })
    expect(bar.togglePause).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(window, { code: 'KeyS', ctrlKey: true, altKey: true, metaKey: true })
    expect(bar.togglePause).toHaveBeenCalledTimes(1)
    const input = document.createElement('input')
    document.body.appendChild(input)
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(screen.getByRole('region', { name: 'Read aloud' })).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('region', { name: 'Read aloud' })).toBeNull()
    fireEvent.keyDown(window, { key: 'Escape' })
    input.remove()
  })

  it('responds to the native Read Aloud and Stop Reading commands', async () => {
    renderPanel()
    await screen.findByRole('button', { name: 'Read aloud' })
    nativeCommand('read-aloud')
    expect(await screen.findByRole('region', { name: 'Read aloud' })).toBeInTheDocument()
    nativeCommand('read-aloud')
    expect(bar.togglePause).toHaveBeenCalledTimes(1)
    nativeCommand('refresh')
    nativeCommand('read-aloud-stop')
    expect(screen.queryByRole('region', { name: 'Read aloud' })).toBeNull()
  })

  it('stops when another file opens', async () => {
    const { rerenderPath } = renderPanel()
    fireEvent.click(await screen.findByRole('button', { name: 'Read aloud' }))
    expect(await screen.findByRole('region', { name: 'Read aloud' })).toBeInTheDocument()
    rerenderPath('other.txt')
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Read aloud' })).toBeNull())
  })

  it('is not offered for images or binary files', async () => {
    renderPanel('photo.png', { type: 'image', content: 'aGk=', editable: false })
    await screen.findByRole('img')
    expect(screen.queryByRole('button', { name: 'Read aloud' })).toBeNull()
    fireEvent.keyDown(window, { code: 'KeyS', ctrlKey: true, altKey: true })
    nativeCommand('read-aloud')
    expect(screen.queryByRole('region', { name: 'Read aloud' })).toBeNull()
  })
})
