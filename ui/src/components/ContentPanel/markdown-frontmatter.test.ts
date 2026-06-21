import { describe, expect, it } from 'vitest'
import { parseMarkdownFrontMatter } from './markdown-frontmatter'

describe('parseMarkdownFrontMatter', () => {
  it('splits bounded start-of-file front matter from the markdown body', () => {
    const parsed = parseMarkdownFrontMatter([
      '---',
      'name: "skill-name"',
      'description: "A useful skill"',
      'compatibility: "GitLocal"',
      'metadata:',
      '  author: "github-spec-kit"',
      '---',
      '',
      '# Skill',
      '',
      '- Read this body',
    ].join('\n'))

    expect(parsed.bodyContent).toBe('# Skill\n\n- Read this body')
    expect(parsed.frontMatter).toMatchObject({
      status: 'recognized',
      startLine: 1,
      endLine: 7,
    })
    expect(parsed.frontMatter?.entries).toEqual([
      { kind: 'field', label: 'name', value: 'skill-name' },
      { kind: 'field', label: 'description', value: 'A useful skill' },
      { kind: 'field', label: 'compatibility', value: 'GitLocal' },
      {
        kind: 'group',
        label: 'metadata',
        children: [
          { kind: 'field', label: 'author', value: 'github-spec-kit' },
        ],
      },
    ])
  })

  it('returns the original body when no recognized front matter exists', () => {
    const content = '# Guide\n\n---\n\nBody'

    expect(parseMarkdownFrontMatter(content)).toEqual({
      bodyContent: content,
      frontMatter: null,
    })
  })

  it('handles empty bounded front matter without hiding the body', () => {
    const parsed = parseMarkdownFrontMatter('---\n---\n\n# Body')

    expect(parsed.bodyContent).toBe('# Body')
    expect(parsed.frontMatter).toMatchObject({
      status: 'empty',
      rawText: '',
      message: 'No metadata fields are defined.',
    })
  })

  it('treats a leading horizontal rule without yaml-shaped content as ordinary markdown', () => {
    const content = '---\n# Heading after rule\n\nBody'

    expect(parseMarkdownFrontMatter(content)).toEqual({
      bodyContent: content,
      frontMatter: null,
    })
  })

  it('preserves incomplete yaml-shaped front matter as a visible fallback', () => {
    const parsed = parseMarkdownFrontMatter('---\nname: missing-close\n# Body')

    expect(parsed.bodyContent).toBe('')
    expect(parsed.frontMatter).toMatchObject({
      status: 'incomplete',
      rawText: 'name: missing-close\n# Body',
      message: 'Front matter starts here but has no closing delimiter.',
    })
  })

  it('parses nested groups, lists, booleans, numbers, quoted strings, arrays, and empty values', () => {
    const parsed = parseMarkdownFrontMatter([
      '---',
      'name: "frontmatter"',
      'enabled: true',
      'retries: 3',
      'tags: ["docs", "skills"]',
      'empty:',
      'metadata:',
      '  author: "gitlocal"',
      '  reviewers:',
      '    - product',
      '    - engineering',
      '---',
      '# Body',
    ].join('\n'))

    expect(parsed.frontMatter?.status).toBe('recognized')
    expect(parsed.frontMatter?.entries).toEqual([
      { kind: 'field', label: 'name', value: 'frontmatter' },
      { kind: 'field', label: 'enabled', value: 'true' },
      { kind: 'field', label: 'retries', value: '3' },
      { kind: 'field', label: 'tags', value: 'docs, skills' },
      { kind: 'group', label: 'empty', children: [] },
      {
        kind: 'group',
        label: 'metadata',
        children: [
          { kind: 'field', label: 'author', value: 'gitlocal' },
          {
            kind: 'group',
            label: 'reviewers',
            children: [
              { kind: 'list-item', label: '-', value: 'product' },
              { kind: 'list-item', label: '-', value: 'engineering' },
            ],
          },
        ],
      },
    ])
  })

  it('marks bounded front matter as malformed when raw lines cannot be structured', () => {
    const parsed = parseMarkdownFrontMatter('---\nname: ok\nnot yaml\n---\n# Body')

    expect(parsed.bodyContent).toBe('# Body')
    expect(parsed.frontMatter?.status).toBe('malformed')
    expect(parsed.frontMatter?.entries).toContainEqual({ kind: 'raw', label: 'Raw', value: 'not yaml' })
  })

  it('does not treat delimiter-like text in a fenced code block as front matter', () => {
    const content = [
      '# Example',
      '',
      '```yaml',
      '---',
      'name: sample',
      '---',
      '```',
    ].join('\n')

    expect(parseMarkdownFrontMatter(content)).toEqual({
      bodyContent: content,
      frontMatter: null,
    })
  })
})
