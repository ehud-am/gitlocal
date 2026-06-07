import { describe, expect, it } from 'vitest'
import {
  buildMarkdownOutputDetails,
  markdownToPlainText,
  titleFromMarkdown,
} from './markdown-output'

describe('markdown output helpers', () => {
  it('uses the first top-level heading as the document title', () => {
    expect(titleFromMarkdown('intro\n# Product Notes\nbody', 'docs/notes.md')).toBe('Product Notes')
  })

  it('falls back to the file name when no heading exists', () => {
    expect(titleFromMarkdown('body', 'docs/notes.md')).toBe('notes.md')
  })

  it('creates plain text suitable for share fallbacks', () => {
    expect(markdownToPlainText('# Title\n\n- [Link](guide.md)\n- `code`')).toContain('Title')
    expect(markdownToPlainText('# Title\n\n- [Link](guide.md)\n- `code`')).toContain('- Link')
    expect(markdownToPlainText('# Title\n\n- [Link](guide.md)\n- `code`')).toContain('- code')
  })

  it('builds output details with an export filename and unsaved marker', () => {
    expect(buildMarkdownOutputDetails('docs/My File.md', '# Title', true)).toMatchObject({
      sourcePath: 'docs/My File.md',
      title: 'Title',
      suggestedFilename: 'My-File.md',
      includesUnsavedEdits: true,
    })
  })
})
