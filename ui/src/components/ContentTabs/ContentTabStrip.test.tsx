import { fireEvent, render, screen } from '@testing-library/react'
import { axe } from 'jest-axe'
import { describe, expect, it, vi } from 'vitest'
import { ContentTabStrip } from './ContentTabStrip'

function renderStrip(overrides: Partial<Parameters<typeof ContentTabStrip>[0]> = {}) {
  const props = {
    tabs: [
      { path: 'README.md', localOnly: false },
      { path: 'docs/guide.md', localOnly: false },
    ],
    activePath: 'README.md' as string | null,
    folderLabel: 'repo',
    folderTitle: 'Folder view: repository root',
    onSelectFolder: vi.fn(),
    onSelectTab: vi.fn(),
    onCloseTab: vi.fn(),
    onCloseAll: vi.fn(),
    ...overrides,
  }
  render(<ContentTabStrip {...props} />)
  return props
}

describe('ContentTabStrip', () => {
  it('renders the folder tab first and one tab per open file, marking the active one', () => {
    renderStrip()
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((tab) => tab.getAttribute('aria-label'))).toEqual(['Folder view: repo', 'README.md', 'guide.md'])
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true')
    expect(tabs[0]).toHaveAttribute('aria-selected', 'false')
    expect(tabs[1]).toHaveAttribute('tabindex', '0')
    expect(tabs[2]).toHaveAttribute('tabindex', '-1')
    expect(tabs[2]).toHaveAttribute('title', 'docs/guide.md')
  })

  it('marks the folder tab active when no file is active and it has no close button', () => {
    renderStrip({ activePath: null })
    expect(screen.getByRole('tab', { name: 'Folder view: repo' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByRole('button', { name: /Close repo/ })).not.toBeInTheDocument()
  })

  it('selects and closes tabs by mouse, including middle-click', () => {
    const props = renderStrip()
    fireEvent.click(screen.getByRole('tab', { name: 'guide.md' }))
    expect(props.onSelectTab).toHaveBeenCalledWith('docs/guide.md')
    fireEvent.click(screen.getByRole('tab', { name: 'Folder view: repo' }))
    expect(props.onSelectFolder).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Close README.md' }))
    expect(props.onCloseTab).toHaveBeenCalledWith('README.md')
    const guideTab = screen.getByRole('tab', { name: 'guide.md' }).parentElement as HTMLElement
    fireEvent(guideTab, new MouseEvent('auxclick', { bubbles: true, button: 1 }))
    expect(props.onCloseTab).toHaveBeenCalledWith('docs/guide.md')
    vi.mocked(props.onCloseTab).mockClear()
    fireEvent(guideTab, new MouseEvent('auxclick', { bubbles: true, button: 2 }))
    expect(props.onCloseTab).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Close all file tabs' }))
    expect(props.onCloseAll).toHaveBeenCalled()
  })

  it('supports keyboard focus movement, activation, and closing', () => {
    const props = renderStrip()
    const [folderTab, readmeTab, guideTab] = screen.getAllByRole('tab')
    readmeTab.focus()
    fireEvent.keyDown(readmeTab, { key: 'ArrowRight' })
    expect(guideTab).toHaveFocus()
    fireEvent.keyDown(guideTab, { key: 'ArrowRight' })
    expect(folderTab).toHaveFocus()
    fireEvent.keyDown(folderTab, { key: 'ArrowLeft' })
    expect(guideTab).toHaveFocus()
    fireEvent.keyDown(guideTab, { key: 'Home' })
    expect(folderTab).toHaveFocus()
    fireEvent.keyDown(folderTab, { key: 'End' })
    expect(guideTab).toHaveFocus()
    fireEvent.keyDown(guideTab, { key: 'Enter' })
    expect(props.onSelectTab).toHaveBeenCalledWith('docs/guide.md')
    fireEvent.keyDown(folderTab, { key: ' ' })
    expect(props.onSelectFolder).toHaveBeenCalled()
    fireEvent.keyDown(folderTab, { key: 'Delete' })
    expect(props.onCloseTab).not.toHaveBeenCalled()
    fireEvent.keyDown(guideTab, { key: 'Delete' })
    expect(props.onCloseTab).toHaveBeenCalledWith('docs/guide.md')
    expect(readmeTab).toHaveFocus()
    fireEvent.keyDown(readmeTab, { key: 'Backspace' })
    expect(props.onCloseTab).toHaveBeenCalledWith('README.md')
    fireEvent.keyDown(readmeTab, { key: 'x' })
  })

  it('shows an unsaved-changes dot on the active tab only', () => {
    renderStrip({ dirty: true })
    expect(screen.getAllByTestId('content-tab-dirty')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Close README.md' })).toHaveAttribute('title', 'README.md has unsaved changes. Close README.md')
  })

  it('adds the parent folder to tabs whose file names collide', () => {
    renderStrip({ tabs: [{ path: 'README.md', localOnly: false }, { path: 'docs/README.md', localOnly: false }] })
    expect(screen.getByRole('tab', { name: 'README.md (root)' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'README.md (docs)' })).toBeInTheDocument()
  })

  it('has no detectable accessibility violations', async () => {
    const { container } = render(
      <ContentTabStrip
        tabs={[{ path: 'README.md', localOnly: false }]}
        activePath="README.md"
        folderLabel="repo"
        folderTitle="Folder view"
        onSelectFolder={vi.fn()}
        onSelectTab={vi.fn()}
        onCloseTab={vi.fn()}
        onCloseAll={vi.fn()}
      />,
    )
    expect((await axe(container)).violations).toHaveLength(0)
  })
})
