import { describe, expect, it } from 'vitest'
import { detectMetafile, emfDrawsUnderWorldTransform, metafileToSvg } from './metafile'
import { emf, rectangle, restoreDc, saveDc, wmf, xform } from './test-support'

describe('detectMetafile', () => {
  it('recognizes EMF, placeable WMF and plain WMF headers', () => {
    expect(detectMetafile(emf())).toBe('emf')
    expect(detectMetafile(wmf())).toBe('wmf')
    expect(detectMetafile(Uint8Array.from([...wmf(false), ...new Array(40).fill(0)]))).toBe('wmf')
    expect(detectMetafile(new Uint8Array(10))).toBeNull()
    expect(detectMetafile(new Uint8Array(64))).toBeNull()
  })
})

describe('emfDrawsUnderWorldTransform', () => {
  const view = (bytes: Uint8Array) => new DataView(bytes.buffer)
  it('is false for pictures drawn with an identity transform', () => {
    expect(emfDrawsUnderWorldTransform(view(emf()))).toBe(false)
    expect(emfDrawsUnderWorldTransform(view(emf([xform(35, [2, 0, 0, 2, 0, 0]), xform(36, [0, 0, 0, 0, 0, 0], 1), rectangle()])))).toBe(false)
    expect(emfDrawsUnderWorldTransform(view(emf([saveDc(), xform(36, [2, 0, 0, 2, 0, 0], 2), restoreDc(-1), rectangle()])))).toBe(false)
    expect(emfDrawsUnderWorldTransform(view(emf([saveDc(), xform(36, [2, 0, 0, 2, 0, 0], 3), restoreDc(1), rectangle()])))).toBe(false)
    // A restore with an out-of-range index leaves the transform alone.
    expect(emfDrawsUnderWorldTransform(view(emf([restoreDc(-5), rectangle()])))).toBe(false)
  })

  it('is true when something is drawn under a scaling or offset transform', () => {
    expect(emfDrawsUnderWorldTransform(view(emf([xform(35, [0.5, 0, 0, 0.5, 0, 0]), rectangle()])))).toBe(true)
    expect(emfDrawsUnderWorldTransform(view(emf([xform(36, [1, 0, 0, 1, 5, 0], 2), rectangle()])))).toBe(true)
    expect(emfDrawsUnderWorldTransform(view(emf([xform(36, [1, 0, 0, 1, 0, 5], 3), rectangle()])))).toBe(true)
    expect(emfDrawsUnderWorldTransform(view(emf([xform(36, [3, 0, 0, 3, 0, 0], 4), rectangle()])))).toBe(true)
    expect(emfDrawsUnderWorldTransform(view(emf([saveDc(), xform(36, [2, 0, 0, 2, 0, 0], 4), restoreDc(5), rectangle()])))).toBe(true)
  })

  it('stops at a malformed record size', () => {
    const bytes = emf([xform(35, [2, 0, 0, 2, 0, 0]), rectangle()])
    new DataView(bytes.buffer).setUint32(108 + 4, 4, true)
    expect(emfDrawsUnderWorldTransform(new DataView(bytes.buffer))).toBe(false)
  })
})

describe('metafileToSvg', () => {
  it('converts an EMF to an SVG document', async () => {
    const svg = await metafileToSvg(emf())
    expect(svg).toMatch(/^<svg/)
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
  })

  it('converts placeable and plain WMFs', async () => {
    expect(await metafileToSvg(wmf())).toMatch(/^<svg/)
    expect(await metafileToSvg(wmf(false))).toMatch(/^<svg/)
  })

  it('reports pictures it cannot show as null', async () => {
    expect(await metafileToSvg(new Uint8Array(64))).toBeNull()
    expect(await metafileToSvg(emf([xform(35, [0.5, 0, 0, 0.5, 0, 0]), rectangle()]))).toBeNull()
    // Nothing drawn at all.
    expect(await metafileToSvg(emf([]))).toBeNull()
    // A truncated file makes the renderer throw.
    expect(await metafileToSvg(emf().slice(0, 120))).toBeNull()
  })

  it('sizes a placeable WMF without a usable bounding box from defaults', async () => {
    const bytes = wmf()
    const view = new DataView(bytes.buffer)
    view.setInt16(10, 0, true)
    expect(await metafileToSvg(bytes)).toMatch(/^<svg/)
  })
})
