import { describe, expect, it } from 'vitest'
import {
  createEditorHistory,
  pushEditorChange,
  redoEditorChange,
  undoEditorChange,
} from './editor-history'

describe('editor history helpers', () => {
  it('undoes and redoes focused editor content states', () => {
    let state = createEditorHistory('one')
    state = pushEditorChange(state, 'two')
    state = pushEditorChange(state, 'three')

    state = undoEditorChange(state)
    expect(state.present).toBe('two')

    state = undoEditorChange(state)
    expect(state.present).toBe('one')

    state = redoEditorChange(state)
    expect(state.present).toBe('two')
  })

  it('clears redo history after a new edit', () => {
    let state = createEditorHistory('one')
    state = pushEditorChange(state, 'two')
    state = undoEditorChange(state)
    state = pushEditorChange(state, 'three')

    expect(redoEditorChange(state).present).toBe('three')
  })
})
