import type JSZip from 'jszip'
import { attr, children, parseXml } from './xml'

export interface Relationship {
  id: string
  type: string
  // Resolved, zip-absolute part path (or the raw URL for an external target).
  target: string
  external: boolean
}

// An opened .pptx (OPC) package. Every XML part (including legacy VML drawings) and relationship
// file is read up front - they are small next to the media - so the rest of the parse can run
// synchronously; media stays in the zip and is only read for images that are actually referenced.
export interface OpcPackage {
  zip: JSZip
  xml: (partPath: string) => Element | null
  rels: (partPath: string) => Map<string, Relationship>
  relByType: (partPath: string, typeSuffix: string) => Relationship | undefined
  hasPart: (partPath: string) => boolean
}

// Relationship targets are relative to the referencing part's own directory; a leading "/" makes
// them package-absolute.
export function resolvePartPath(basePartPath: string, target: string): string {
  const baseDir = target.startsWith('/') ? '' : basePartPath.slice(0, basePartPath.lastIndexOf('/'))
  const resolved: string[] = []
  for (const segment of `${baseDir}/${target}`.split('/')) {
    if (segment === '..') resolved.pop()
    else if (segment !== '.' && segment !== '') resolved.push(segment)
  }
  return resolved.join('/')
}

export function relsPathFor(partPath: string): string {
  const slash = partPath.lastIndexOf('/')
  return `${partPath.slice(0, slash + 1)}_rels/${partPath.slice(slash + 1)}.rels`
}

export async function openPackage(bytes: Uint8Array): Promise<OpcPackage> {
  const { default: JSZipImpl } = await import('jszip')
  const zip = await JSZipImpl.loadAsync(bytes)

  const texts = new Map<string, string>()
  const textEntries = Object.values(zip.files).filter((entry) => !entry.dir && /\.(xml|rels|vml)$/i.test(entry.name))
  await Promise.all(textEntries.map(async (entry) => {
    texts.set(entry.name, await entry.async('text'))
  }))

  const xmlCache = new Map<string, Element | null>()
  const relsCache = new Map<string, Map<string, Relationship>>()

  const xml = (partPath: string): Element | null => {
    if (xmlCache.has(partPath)) return xmlCache.get(partPath) ?? null
    const text = texts.get(partPath)
    const root = text === undefined ? null : parseXml(text)
    xmlCache.set(partPath, root)
    return root
  }

  const rels = (partPath: string): Map<string, Relationship> => {
    const cached = relsCache.get(partPath)
    if (cached) return cached
    const result = new Map<string, Relationship>()
    for (const rel of children(xml(relsPathFor(partPath)), 'Relationship')) {
      const id = attr(rel, 'Id')
      const type = attr(rel, 'Type')
      const target = attr(rel, 'Target')
      if (!id || !type || target === null) continue
      const external = attr(rel, 'TargetMode') === 'External'
      result.set(id, { id, type, external, target: external ? target : resolvePartPath(partPath, target) })
    }
    relsCache.set(partPath, result)
    return result
  }

  const relByType = (partPath: string, typeSuffix: string): Relationship | undefined => {
    for (const rel of rels(partPath).values()) {
      if (rel.type.endsWith(typeSuffix)) return rel
    }
    return undefined
  }

  return { zip, xml, rels, relByType, hasPart: (partPath) => zip.file(partPath) !== null }
}
