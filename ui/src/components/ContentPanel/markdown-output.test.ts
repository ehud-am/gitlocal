import { describe, expect, it } from 'vitest'
import {
  buildRenderedPdfHtml,
  buildMarkdownOutputDetails,
  markdownToPlainText,
  textRepresentationForCopy,
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

  it('returns raw and rendered text representations for copy actions', () => {
    const markdownRepresentations = textRepresentationForCopy('# Title\n\n- One')
    expect(markdownRepresentations.raw).toBe('# Title\n\n- One')
    expect(markdownRepresentations.rendered).toContain('Title')
    expect(markdownRepresentations.rendered).toContain('- One')
    expect(textRepresentationForCopy('source', 'Rendered Source')).toEqual({
      raw: 'source',
      rendered: 'Rendered Source',
    })
  })

  it('builds printable PDF HTML from rendered text without app chrome', () => {
    const html = buildRenderedPdfHtml('Release <Notes>', 'One\n\nTwo')

    expect(html).toContain('Release &lt;Notes&gt;')
    expect(html).toContain('<p>One</p>')
    expect(html).toContain('<p>Two</p>')
    expect(html).not.toContain('app-header')
    expect(html).not.toContain('markdown-share-actions')
  })

  it('includes printable HTML in output details', () => {
    expect(buildMarkdownOutputDetails('docs/release.md', '# Release Notes', false).pdfHtml).toContain('Release Notes')
  })
})
