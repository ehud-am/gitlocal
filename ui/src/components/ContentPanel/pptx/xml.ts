// Small DOM helpers for reading OOXML parts. Parts are parsed with the platform DOMParser (always
// present in browsers, WKWebView and jsdom), which - unlike a tag-name-keyed object parse - keeps
// document order. Order matters in OOXML: it is the z-order of shapes on a slide and the position
// a theme's style lists are indexed by (issue #99).
//
// Elements are matched by local name only. PowerPoint always uses the conventional p:/a:/r:
// prefixes, but the format does not require them, and no part this preview reads uses the same
// local name for two different things in a position where both could appear.

export function parseXml(text: string): Element | null {
  // Some generators write parts with a UTF-8 byte order mark, which survives decoding as U+FEFF.
  // WebKit's parser (the macOS app) rejects the XML declaration after it, so it is dropped here.
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  const doc = new DOMParser().parseFromString(source, 'application/xml')
  const root = doc.documentElement
  if (!root || root.localName === 'parsererror' || doc.getElementsByTagName('parsererror').length > 0) return null
  return root
}

export function children(element: Element | null | undefined, localName?: string): Element[] {
  if (!element) return []
  const result: Element[] = []
  for (let node = element.firstElementChild; node; node = node.nextElementSibling) {
    if (localName === undefined || node.localName === localName) result.push(node)
  }
  return result
}

export function child(element: Element | null | undefined, localName: string): Element | null {
  if (!element) return null
  for (let node = element.firstElementChild; node; node = node.nextElementSibling) {
    if (node.localName === localName) return node
  }
  return null
}

// Follows a chain of single children, e.g. path(sp, 'spPr', 'xfrm', 'off').
export function path(element: Element | null | undefined, ...localNames: string[]): Element | null {
  let current: Element | null = element ?? null
  for (const name of localNames) {
    current = child(current, name)
    if (!current) return null
  }
  return current
}

// Reads an attribute by local name, so r:embed / r:id resolve whatever prefix the part used.
export function attr(element: Element | null | undefined, localName: string): string | null {
  if (!element) return null
  const direct = element.getAttribute(localName)
  if (direct !== null) return direct
  for (const attribute of Array.from(element.attributes)) {
    if (attribute.localName === localName) return attribute.value
  }
  return null
}

// A relationship-id attribute (r:id, r:embed, r:dm, ...). Looked up by namespace first because an
// element can carry both an unprefixed attribute and an r: one with the same local name
// (<p:sldId id="256" r:id="rId2"/>).
const RELATIONSHIPS_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'

export function relAttr(element: Element | null | undefined, localName: string): string | null {
  if (!element) return null
  const namespaced = element.getAttributeNS(RELATIONSHIPS_NS, localName)
  if (namespaced) return namespaced
  for (const attribute of Array.from(element.attributes)) {
    if (attribute.localName === localName && attribute.prefix) return attribute.value
  }
  return null
}

export function numAttr(element: Element | null | undefined, localName: string): number | undefined {
  const raw = attr(element, localName)
  if (raw === null || raw.trim() === '') return undefined
  const value = Number(raw)
  return Number.isFinite(value) ? value : undefined
}

export function boolAttr(element: Element | null | undefined, localName: string): boolean | undefined {
  const raw = attr(element, localName)
  if (raw === null) return undefined
  return raw === '1' || raw === 'true' || raw === 'on'
}

// Markup Compatibility: <mc:AlternateContent> wraps content a newer Office version understands
// (mc:Choice) together with a fallback older readers can use (mc:Fallback). The fallback is always
// expressed in the base schema this preview reads, so it is the safer choice; a Choice is only used
// when no Fallback exists.
export function resolveAlternateContent(element: Element): Element[] {
  if (element.localName !== 'AlternateContent') return [element]
  const fallback = child(element, 'Fallback')
  const chosen = fallback ?? child(element, 'Choice')
  return chosen ? children(chosen).flatMap(resolveAlternateContent) : []
}

// The element children of a container with any AlternateContent wrappers replaced by their content.
export function contentChildren(element: Element | null | undefined): Element[] {
  return children(element).flatMap(resolveAlternateContent)
}
