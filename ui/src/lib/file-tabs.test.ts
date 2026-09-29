import { describe, expect, it } from 'vitest'
import { closeTab, closeTabsUnder, describeTabs, hasTab, openTab, tabToActivateAfterClose, type FileTab } from './file-tabs'

const tab = (path: string, localOnly = false): FileTab => ({ path, localOnly })

describe('file-tabs', () => {
  it('appends a new tab when no file tab is active', () => {
    expect(openTab([], 'a.md', false, '')).toEqual([tab('a.md')])
    expect(openTab([tab('a.md')], 'b.md', false, '')).toEqual([tab('a.md'), tab('b.md')])
  })

  it('inserts a new tab right after the active file tab', () => {
    expect(openTab([tab('a.md'), tab('c.md')], 'b.md', false, 'a.md')).toEqual([tab('a.md'), tab('b.md'), tab('c.md')])
  })

  it('keeps an already-open tab in place and returns the same list when nothing changes', () => {
    const tabs = [tab('a.md'), tab('b.md')]
    expect(openTab(tabs, 'a.md', false, 'b.md')).toBe(tabs)
  })

  it('refreshes the localOnly flag of an already-open tab', () => {
    expect(openTab([tab('a.md'), tab('b.md')], 'b.md', true, 'a.md')).toEqual([tab('a.md'), tab('b.md', true)])
  })

  it('closes a tab and ignores unknown paths', () => {
    const tabs = [tab('a.md'), tab('b.md')]
    expect(closeTab(tabs, 'a.md')).toEqual([tab('b.md')])
    expect(closeTab(tabs, 'x.md')).toBe(tabs)
    expect(hasTab(tabs, 'b.md')).toBe(true)
    expect(hasTab(tabs, 'x.md')).toBe(false)
  })

  it('picks the right neighbor, then the left neighbor, then none after closing the active tab', () => {
    const tabs = [tab('a.md'), tab('b.md'), tab('c.md')]
    expect(tabToActivateAfterClose(tabs, 'b.md')).toEqual(tab('c.md'))
    expect(tabToActivateAfterClose(tabs, 'c.md')).toEqual(tab('b.md'))
    expect(tabToActivateAfterClose([tab('a.md')], 'a.md')).toBeNull()
    expect(tabToActivateAfterClose(tabs, 'x.md')).toBeNull()
  })

  it('closes every tab inside a deleted folder', () => {
    const tabs = [tab('docs/a.md'), tab('docs/sub/b.md'), tab('docsx/c.md'), tab('d.md')]
    expect(closeTabsUnder(tabs, 'docs')).toEqual([tab('docsx/c.md'), tab('d.md')])
    expect(closeTabsUnder(tabs, 'other')).toBe(tabs)
    expect(closeTabsUnder(tabs, '')).toEqual([])
  })

  it('labels tabs by file name and adds the parent folder only for duplicate names', () => {
    expect(describeTabs([tab('README.md'), tab('docs/README.md'), tab('src/index.ts')]).map(({ label, detail }) => [label, detail])).toEqual([
      ['README.md', 'root'],
      ['README.md', 'docs'],
      ['index.ts', ''],
    ])
  })
})
