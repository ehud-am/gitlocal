// Converts the legacy Windows metafile formats (EMF, WMF) that older and corporate decks often use
// for logos and diagrams into SVG markup. No browser decodes these natively, so they are drawn with
// the EMFJS/WMFJS renderers from rtf.js (MIT), loaded lazily only when a deck contains one.
//
// The SVG is shown through an <img>/data URL like any other image, so it can never run script.

interface MetafileRenderer {
  render: (info: Record<string, string | number>) => SVGElement
}

interface MetafileModule {
  Renderer: new (data: ArrayBuffer) => MetafileRenderer
  loggingEnabled: (enabled: boolean) => void
}

async function loadModule(kind: 'emf' | 'wmf'): Promise<MetafileModule> {
  const imported = kind === 'emf'
    ? await import('rtf.js/dist/EMFJS.bundle.js')
    : await import('rtf.js/dist/WMFJS.bundle.js')
  const module = ((imported as { default?: unknown }).default ?? imported) as MetafileModule
  module.loggingEnabled(false)
  return module
}

const EMF_SIGNATURE = 0x464d4520 // " EMF" at byte offset 40 of the EMF header record
const WMF_PLACEABLE_KEY = 0x9ac6cdd7

export function detectMetafile(bytes: Uint8Array): 'emf' | 'wmf' | null {
  if (bytes.byteLength < 44) return null
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (view.getUint32(0, true) === 1 && view.getUint32(40, true) === EMF_SIGNATURE) return 'emf'
  if (view.getUint32(0, true) === WMF_PLACEABLE_KEY) return 'wmf'
  // A WMF without the "placeable" header starts with its type (1 = memory, 2 = disk) and a
  // header size of 9 (in 16-bit words).
  const type = view.getUint16(0, true)
  if ((type === 1 || type === 2) && view.getUint16(2, true) === 9) return 'wmf'
  return null
}

// EMF record types that draw something (polylines, shapes, paths, text, bitmaps).
const EMF_DRAWING_RECORDS = new Set([
  2, 3, 4, 5, 6, 7, 8, 42, 43, 44, 45, 46, 47, 54, 55, 56, 62, 63, 64,
  76, 77, 78, 79, 80, 81, 83, 84, 85, 86, 87, 88, 89, 90, 91, 96, 97, 108, 114, 116,
])

type Xform = [number, number, number, number, number, number]
const IDENTITY: Xform = [1, 0, 0, 1, 0, 0]

function multiply(a: Xform, b: Xform): Xform {
  return [
    a[0] * b[0] + a[1] * b[2],
    a[0] * b[1] + a[1] * b[3],
    a[2] * b[0] + a[3] * b[2],
    a[2] * b[1] + a[3] * b[3],
    a[4] * b[0] + a[5] * b[2] + b[4],
    a[4] * b[1] + a[5] * b[3] + b[5],
  ]
}

const isIdentity = (xform: Xform) => xform.every((value, index) => Math.abs(value - IDENTITY[index]) < 1e-6)

// The EMF renderer ignores world transforms (EMR_SETWORLDTRANSFORM / EMR_MODIFYWORLDTRANSFORM),
// which Office uses for charts and scaled clip art. A picture that draws anything under a
// non-identity world transform would come out at the wrong scale or position, so it is reported
// as unsupported instead.
export function emfDrawsUnderWorldTransform(view: DataView): boolean {
  let current: Xform = IDENTITY
  const saved: Xform[] = []
  let offset = 0
  while (offset + 8 <= view.byteLength) {
    const type = view.getUint32(offset, true)
    const size = view.getUint32(offset + 4, true)
    if (size < 8 || offset + size > view.byteLength) break
    const readXform = (): Xform => [0, 4, 8, 12, 16, 20].map((at) => view.getFloat32(offset + 8 + at, true)) as Xform
    if (type === 35 && size >= 32) current = readXform()
    else if (type === 36 && size >= 36) {
      const mode = view.getUint32(offset + 32, true)
      const xform = readXform()
      if (mode === 1) current = IDENTITY
      else if (mode === 2) current = multiply(xform, current)
      else if (mode === 3) current = multiply(current, xform)
      else if (mode === 4) current = xform
    } else if (type === 33) saved.push(current)
    else if (type === 34 && size >= 12) {
      const relative = view.getInt32(offset + 8, true)
      const index = relative < 0 ? saved.length + relative : relative - 1
      if (index >= 0 && index < saved.length) {
        current = saved[index]
        saved.length = index
      }
    } else if (EMF_DRAWING_RECORDS.has(type) && !isIdentity(current)) return true
    if (type === 14) break // EMR_EOF
    offset += size
  }
  return false
}

// The size the metafile describes itself as, used as the SVG's coordinate extent.
function metafileExtent(kind: 'emf' | 'wmf', view: DataView): { width: number; height: number } {
  if (kind === 'emf') {
    // EMR_HEADER bounds: inclusive device-unit rectangle at offset 8.
    const width = view.getInt32(16, true) - view.getInt32(8, true) + 1
    const height = view.getInt32(20, true) - view.getInt32(12, true) + 1
    return { width: Math.max(1, width), height: Math.max(1, height) }
  }
  if (view.getUint32(0, true) === WMF_PLACEABLE_KEY) {
    // Placeable header bounding box (16-bit logical units) at offset 6.
    const width = Math.abs(view.getInt16(10, true) - view.getInt16(6, true))
    const height = Math.abs(view.getInt16(12, true) - view.getInt16(8, true))
    if (width > 0 && height > 0) {
      const scale = 1000 / Math.max(width, height)
      return { width: Math.round(width * scale), height: Math.round(height * scale) }
    }
  }
  return { width: 1000, height: 1000 }
}

export async function metafileToSvg(bytes: Uint8Array): Promise<string | null> {
  const kind = detectMetafile(bytes)
  if (!kind) return null
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  if (kind === 'emf' && emfDrawsUnderWorldTransform(new DataView(buffer))) return null
  try {
    const module = await loadModule(kind)
    const { width, height } = metafileExtent(kind, new DataView(buffer))
    const svg = new module.Renderer(buffer).render({
      width: `${width}px`,
      height: `${height}px`,
      wExt: width,
      hExt: height,
      xExt: width,
      yExt: height,
      mapMode: 8, // MM_ANISOTROPIC: stretch the picture to the requested extent
    })
    // A metafile made only of records the renderer doesn't support (EMF+ only, OpenGL) comes back
    // empty; report that as "can't show" rather than drawing a blank box.
    if (!svg.firstElementChild) return null
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    return new XMLSerializer().serializeToString(svg)
  } catch {
    return null
  }
}
