import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import InlineFileEditor from './InlineFileEditor'

describe('InlineFileEditor undo and redo', () => {
  it('offers conflict recovery actions without losing the draft', () => {
    const onReloadFromDisk = vi.fn()
    const onChange = vi.fn()

    render(
      <InlineFileEditor
        path="README.md"
        content="draft"
        error="The file changed on disk before your save completed. Your edit was not saved. Reload the file to review the latest version, then apply your changes again."
        onChange={onChange}
        onSave={vi.fn()}
        onCancel={vi.fn()}
        onReloadFromDisk={onReloadFromDisk}
      />,
    )

    const textarea = screen.getByLabelText(/edit file content/i)
    fireEvent.change(textarea, { target: { value: 'local draft' } })
    fireEvent.click(screen.getByRole('button', { name: /keep editing/i }))
    expect(document.activeElement).toBe(textarea)
    expect(textarea).toHaveValue('local draft')

    fireEvent.click(screen.getByRole('button', { name: /reload from disk/i }))
    expect(onReloadFromDisk).toHaveBeenCalledTimes(1)
  })

  it('handles standard undo and redo keyboard shortcuts in the focused editor', () => {
    const onChange = vi.fn()

    render(
      <InlineFileEditor
        path="README.md"
        content="one"
        onChange={onChange}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    const textarea = screen.getByLabelText(/edit file content/i)
    fireEvent.change(textarea, { target: { value: 'two' } })
    fireEvent.change(textarea, { target: { value: 'three' } })

    fireEvent.keyDown(textarea, { key: 'z', metaKey: true })
    expect(onChange).toHaveBeenLastCalledWith('two')

    fireEvent.keyDown(textarea, { key: 'Z', metaKey: true, shiftKey: true })
    expect(onChange).toHaveBeenLastCalledWith('three')
  })

  it('handles native undo commands only when the editor has focus', () => {
    const onChange = vi.fn()

    render(
      <InlineFileEditor
        path="README.md"
        content="one"
        onChange={onChange}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    const textarea = screen.getByLabelText(/edit file content/i)
    fireEvent.change(textarea, { target: { value: 'two' } })
    textarea.focus()

    window.dispatchEvent(new CustomEvent('gitlocal:native-command', { detail: { command: 'undo' } }))
    expect(onChange).toHaveBeenLastCalledWith('one')

    textarea.blur()
    window.dispatchEvent(new CustomEvent('gitlocal:native-command', { detail: { command: 'redo' } }))
    expect(onChange).toHaveBeenLastCalledWith('one')
  })

  it('does not apply native undo or redo while another field has focus', () => {
    const onChange = vi.fn()

    render(
      <>
        <input aria-label="search query" />
        <InlineFileEditor
          path="README.md"
          content="one"
          onChange={onChange}
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />
      </>,
    )

    const textarea = screen.getByLabelText(/edit file content/i)
    fireEvent.change(textarea, { target: { value: 'two' } })
    screen.getByLabelText(/search query/i).focus()

    window.dispatchEvent(new CustomEvent('gitlocal:native-command', { detail: { command: 'undo' } }))
    window.dispatchEvent(new CustomEvent('gitlocal:native-command', { detail: { command: 'redo' } }))

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenLastCalledWith('two')
  })
})
