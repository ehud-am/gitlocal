import { describe, expect, it } from 'vitest'
import {
  isNativeSelectionControl,
  isSelectAllShortcut,
  selectContentPanelScope,
} from './content-panel-selection'

describe('content-panel-selection', () => {
  it('selects only the configured content panel root', () => {
    document.body.innerHTML = [
      '<header>GitLocal header</header>',
      '<main id="panel">',
      '  <button>File actions</button>',
      '  <article id="content"><h1>Release Notes</h1><p>Panel body</p></article>',
      '</main>',
      '<aside>Repository tree</aside>',
    ].join('')

    const panel = document.getElementById('panel') as HTMLElement
    const content = document.getElementById('content') as HTMLElement

    expect(selectContentPanelScope(panel, content)).toBe('content-panel')
    expect(document.getSelection()?.toString()).toContain('Release Notes')
    expect(document.getSelection()?.toString()).toContain('Panel body')
    expect(document.getSelection()?.toString()).not.toContain('GitLocal header')
    expect(document.getSelection()?.toString()).not.toContain('Repository tree')
    expect(document.getSelection()?.toString()).not.toContain('File actions')
  })

  it('preserves native selection controls instead of selecting the panel', () => {
    document.body.innerHTML = [
      '<main id="panel">',
      '  <article id="content"><p>Panel body</p></article>',
      '  <input id="search" value="search text" />',
      '</main>',
    ].join('')

    const panel = document.getElementById('panel') as HTMLElement
    const content = document.getElementById('content') as HTMLElement
    const search = document.getElementById('search') as HTMLInputElement
    search.focus()

    expect(isNativeSelectionControl(search)).toBe(true)
    expect(selectContentPanelScope(panel, content)).toBe('native-control')
    expect(search.selectionStart).toBe(0)
    expect(search.selectionEnd).toBe('search text'.length)
    expect(document.getSelection()?.toString()).not.toContain('Panel body')
  })

  it('selects editable draft textarea content when the panel owns selection', () => {
    document.body.innerHTML = [
      '<main id="panel">',
      '  <section id="content"><textarea>draft body</textarea><button>Save</button></section>',
      '</main>',
    ].join('')

    const panel = document.getElementById('panel') as HTMLElement
    const content = document.getElementById('content') as HTMLElement

    expect(selectContentPanelScope(panel, content)).toBe('content-panel')
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement
    expect(textarea.selectionStart).toBe(0)
    expect(textarea.selectionEnd).toBe('draft body'.length)
  })

  it('does not select the panel when another app control is active', () => {
    document.body.innerHTML = [
      '<button id="sidebar">README.md</button>',
      '<main id="panel"><article id="content">Panel body</article></main>',
    ].join('')

    const panel = document.getElementById('panel') as HTMLElement
    const content = document.getElementById('content') as HTMLElement
    document.getElementById('sidebar')?.focus()

    expect(selectContentPanelScope(panel, content)).toBe('unavailable')
    expect(document.getSelection()?.toString()).toBe('')
  })

  it('detects platform select-all shortcuts', () => {
    expect(isSelectAllShortcut({ key: 'a', metaKey: true, ctrlKey: false, altKey: false })).toBe(true)
    expect(isSelectAllShortcut({ key: 'A', metaKey: false, ctrlKey: true, altKey: false })).toBe(true)
    expect(isSelectAllShortcut({ key: 'a', metaKey: false, ctrlKey: false, altKey: false })).toBe(false)
    expect(isSelectAllShortcut({ key: 'a', metaKey: true, ctrlKey: false, altKey: true })).toBe(false)
  })
})
