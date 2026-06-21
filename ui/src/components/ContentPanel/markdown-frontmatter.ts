export type FrontMatterStatus = 'none' | 'recognized' | 'empty' | 'malformed' | 'incomplete'

export type MetadataEntryKind = 'field' | 'group' | 'list-item' | 'raw'

export interface MetadataEntry {
  kind: MetadataEntryKind
  label: string
  value?: string
  children?: MetadataEntry[]
}

export interface FrontMatterMetadata {
  rawText: string
  startLine: number
  endLine: number
  entries: MetadataEntry[]
  status: FrontMatterStatus
  message?: string
}

export interface ParsedMarkdownFrontMatter {
  bodyContent: string
  frontMatter: FrontMatterMetadata | null
}

interface EntryParent {
  indent: number
  children: MetadataEntry[]
}

function isDelimiter(line: string): boolean {
  return line.trim() === '---'
}

function looksLikeYamlLine(line: string): boolean {
  return /^\s*(?:-\s+)?[A-Za-z_][\w.-]*\s*:/.test(line) || /^\s*-\s+\S+/.test(line)
}

function trimOneLeadingNewline(value: string): string {
  return value.replace(/^\r?\n/, '')
}

function stripValueQuotes(value: string): string {
  const trimmed = value.trim()
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

function normalizeScalarValue(value: string): string {
  const trimmed = stripValueQuotes(value)
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed
      .slice(1, -1)
      .split(',')
      .map((item) => stripValueQuotes(item))
      .filter(Boolean)
      .join(', ')
  }
  return trimmed
}

function metadataEntryFromLine(trimmed: string): MetadataEntry | null {
  const listField = trimmed.match(/^-\s+([^:#][^:]*):\s*(.*)$/)
  if (listField) {
    const value = normalizeScalarValue(listField[2])
    return {
      kind: value ? 'field' : 'group',
      label: listField[1].trim(),
      ...(value ? { value } : {}),
      ...(!value ? { children: [] } : {}),
    }
  }

  const listItem = trimmed.match(/^-\s+(.+)$/)
  if (listItem) {
    return {
      kind: 'list-item',
      label: '-',
      value: normalizeScalarValue(listItem[1]),
    }
  }

  const field = trimmed.match(/^([^:#][^:]*):\s*(.*)$/)
  if (!field) return null

  const value = normalizeScalarValue(field[2])
  return {
    kind: value ? 'field' : 'group',
    label: field[1].trim(),
    ...(value ? { value } : {}),
    ...(!value ? { children: [] } : {}),
  }
}

function attachEntry(parents: EntryParent[], indent: number, entry: MetadataEntry): void {
  while (parents.length > 1 && indent <= parents[parents.length - 1].indent) {
    parents.pop()
  }

  const parent = parents[parents.length - 1]
  parent.children.push(entry)

  if (entry.children) {
    parents.push({ indent, children: entry.children })
  }
}

function parseMetadataEntries(rawText: string): { entries: MetadataEntry[]; malformed: boolean } {
  const entries: MetadataEntry[] = []
  const parents: EntryParent[] = [{ indent: -1, children: entries }]
  let malformed = false

  for (const line of rawText.split(/\r?\n/)) {
    if (!line.trim()) continue

    const indent = line.match(/^\s*/)?.[0].length ?? 0
    const trimmed = line.trim()
    const entry = metadataEntryFromLine(trimmed)

    if (!entry) {
      malformed = true
      attachEntry(parents, indent, { kind: 'raw', label: 'Raw', value: trimmed })
      continue
    }

    attachEntry(parents, indent, entry)
  }

  return { entries, malformed }
}

export function parseMarkdownFrontMatter(content: string): ParsedMarkdownFrontMatter {
  const normalizedContent = content.replace(/^\uFEFF/, '')
  const lines = normalizedContent.split(/\r?\n/)
  const firstLine = lines[0] ?? ''

  if (!isDelimiter(firstLine)) {
    return { bodyContent: content, frontMatter: null }
  }

  const closingIndex = lines.findIndex((line, index) => index > 0 && isDelimiter(line))
  if (closingIndex < 0) {
    const remainingLines = lines.slice(1)
    const hasYamlShape = remainingLines.some(looksLikeYamlLine)
    if (!hasYamlShape) {
      return { bodyContent: content, frontMatter: null }
    }

    return {
      bodyContent: '',
      frontMatter: {
        rawText: remainingLines.join('\n'),
        startLine: 1,
        endLine: lines.length,
        entries: [],
        status: 'incomplete',
        message: 'Front matter starts here but has no closing delimiter.',
      },
    }
  }

  const rawText = lines.slice(1, closingIndex).join('\n')
  const bodyContent = trimOneLeadingNewline(lines.slice(closingIndex + 1).join('\n'))

  if (!rawText.trim()) {
    return {
      bodyContent,
      frontMatter: {
        rawText,
        startLine: 1,
        endLine: closingIndex + 1,
        entries: [],
        status: 'empty',
        message: 'No metadata fields are defined.',
      },
    }
  }

  const { entries, malformed } = parseMetadataEntries(rawText)

  return {
    bodyContent,
    frontMatter: {
      rawText,
      startLine: 1,
      endLine: closingIndex + 1,
      entries,
      status: malformed ? 'malformed' : 'recognized',
      ...(malformed ? { message: 'Some metadata lines could not be structured.' } : {}),
    },
  }
}
