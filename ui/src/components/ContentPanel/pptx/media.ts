import type { ImageRef } from './model'
import type { OpcPackage } from './package'
import { detectMetafile, metafileToSvg } from './metafile'

// Raster formats every mainstream browser (and the macOS app's WKWebView) decodes in an <img>.
const RASTER_MIME: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', jpe: 'image/jpeg', gif: 'image/gif',
  bmp: 'image/bmp', dib: 'image/bmp', webp: 'image/webp', svg: 'image/svg+xml',
}

function sniffMime(bytes: Uint8Array): string | null {
  const startsWith = (...signature: number[]) => signature.every((value, index) => bytes[index] === value)
  if (startsWith(0x89, 0x50, 0x4e, 0x47)) return 'image/png'
  if (startsWith(0xff, 0xd8, 0xff)) return 'image/jpeg'
  if (startsWith(0x47, 0x49, 0x46, 0x38)) return 'image/gif'
  if (startsWith(0x42, 0x4d)) return 'image/bmp'
  return null
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk))
  }
  return btoa(binary)
}

// Object URLs avoid holding a second, base64-inflated copy of every image in memory; environments
// without URL.createObjectURL get a data URL instead.
function makeUrl(data: Uint8Array | string, mime: string, objectUrls: string[]): string {
  if (typeof URL.createObjectURL === 'function') {
    const url = URL.createObjectURL(new Blob([data as BlobPart], { type: mime }))
    objectUrls.push(url)
    return url
  }
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data
  return `data:${mime};base64,${toBase64(bytes)}`
}

// .emz/.wmz are gzip-compressed metafiles.
async function gunzip(bytes: Uint8Array): Promise<Uint8Array | null> {
  if (typeof DecompressionStream === 'undefined') return null
  try {
    const source = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes)
        controller.close()
      },
    })
    const stream = source.pipeThrough(new DecompressionStream('gzip') as unknown as TransformStream<Uint8Array, Uint8Array>)
    return new Uint8Array(await new Response(stream).arrayBuffer())
  } catch {
    return null
  }
}

async function loadOne(pkg: OpcPackage, mediaPath: string, objectUrls: string[]): Promise<string | null> {
  const file = pkg.zip.file(mediaPath)
  if (!file) return null
  try {
    let bytes = await file.async('uint8array')
    const extension = mediaPath.slice(mediaPath.lastIndexOf('.') + 1).toLowerCase()
    if (extension === 'emz' || extension === 'wmz') {
      const unzipped = await gunzip(bytes)
      if (!unzipped) return null
      bytes = unzipped
    }
    if (detectMetafile(bytes)) {
      const svg = await metafileToSvg(bytes)
      return svg ? makeUrl(svg, 'image/svg+xml', objectUrls) : null
    }
    const mime = sniffMime(bytes) ?? RASTER_MIME[extension]
    return mime ? makeUrl(bytes, mime, objectUrls) : null
  } catch {
    return null
  }
}

// Loads each referenced media part once and fills in every ImageRef's src. Returns the object URLs
// created, so the caller can revoke them when the preview goes away.
export async function loadMedia(pkg: OpcPackage, refs: ImageRef[]): Promise<string[]> {
  const objectUrls: string[] = []
  const byPath = new Map<string, Promise<string | null>>()
  for (const ref of refs) {
    if (!byPath.has(ref.mediaPath)) byPath.set(ref.mediaPath, loadOne(pkg, ref.mediaPath, objectUrls))
  }
  await Promise.all(refs.map(async (ref) => {
    ref.src = (await byPath.get(ref.mediaPath)) ?? null
  }))
  return objectUrls
}
