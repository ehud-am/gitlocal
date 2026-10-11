import type { CSSProperties } from 'react'
import type { Fill, ImageRef } from './model'

// Fills are drawn as CSS backgrounds on a layer clipped to the shape's outline, which gives
// gradients, stretched or tiled pictures and patterns without per-shape SVG <defs> bookkeeping.

function gradientCss(fill: Extract<Fill, { type: 'gradient' }>): string {
  const stops = fill.stops.map((stop) => `${stop.color} ${Math.round(stop.offset * 10000) / 100}%`).join(', ')
  if (fill.path === 'linear') {
    // DrawingML measures the angle clockwise from "left to right"; CSS clockwise from "to top".
    return `linear-gradient(${Math.round((fill.angle + 90) * 100) / 100}deg, ${stops})`
  }
  const at = `${Math.round(fill.focus.x * 10000) / 100}% ${Math.round(fill.focus.y * 10000) / 100}%`
  const shape = fill.path === 'circle' ? 'circle' : 'ellipse'
  return `radial-gradient(${shape} farthest-corner at ${at}, ${stops})`
}

function patternCss(fill: Extract<Fill, { type: 'pattern' }>): CSSProperties {
  const { fg, bg, preset } = fill
  const percent = /^pct(\d+)$/.exec(preset)
  if (percent) return { backgroundColor: `color-mix(in srgb, ${fg} ${percent[1]}%, ${bg})` }
  const lines = (angle: number, gap: number) => `repeating-linear-gradient(${angle}deg, ${fg} 0 1px, ${bg} 1px ${gap}px)`
  if (/horz/i.test(preset)) return { backgroundImage: lines(0, preset.startsWith('nar') ? 3 : 5) }
  if (/vert/i.test(preset)) return { backgroundImage: lines(90, preset.startsWith('nar') ? 3 : 5) }
  if (/dnDiag/i.test(preset)) return { backgroundImage: lines(45, 5) }
  if (/upDiag/i.test(preset)) return { backgroundImage: lines(-45, 5) }
  if (/cross|grid|Check|trellis/i.test(preset)) return { backgroundImage: `${lines(0, 6)}, ${lines(90, 6)}` }
  return { backgroundColor: `color-mix(in srgb, ${fg} 50%, ${bg})` }
}

export function imageCropStyle(image: ImageRef, width: number, height: number): CSSProperties {
  // srcRect insets cut that fraction of the source image off each edge; the remainder stretches to
  // fill the box, so the full image is scaled up by 1 / (visible fraction).
  const visibleW = 1 - image.crop.l - image.crop.r
  const visibleH = 1 - image.crop.t - image.crop.b
  const fullW = visibleW > 0 ? width / visibleW : width
  const fullH = visibleH > 0 ? height / visibleH : height
  return {
    position: 'absolute',
    left: `${-image.crop.l * fullW}px`,
    top: `${-image.crop.t * fullH}px`,
    width: `${fullW}px`,
    height: `${fullH}px`,
    maxWidth: 'none',
    opacity: image.opacity < 1 ? image.opacity : undefined,
    filter: image.grayscale ? 'grayscale(1)' : undefined,
  }
}

// CSS for a fill layer the size of the shape (null when nothing should be drawn).
export function fillStyle(fill: Fill | null, width: number, height: number): CSSProperties | null {
  if (!fill) return null
  switch (fill.type) {
    case 'none': return null
    case 'solid': return { backgroundColor: fill.color }
    case 'gradient': return { backgroundImage: gradientCss(fill) }
    case 'pattern': return patternCss(fill)
    default: {
      const { image, tile } = fill
      if (!image.src) return null
      const url = `url("${image.src}")`
      if (tile) {
        return {
          backgroundImage: url,
          backgroundRepeat: 'repeat',
          backgroundPosition: `${tile.tx}px ${tile.ty}px`,
          opacity: image.opacity < 1 ? image.opacity : undefined,
        }
      }
      const crop = imageCropStyle(image, width, height)
      return {
        backgroundImage: url,
        backgroundRepeat: 'no-repeat',
        backgroundSize: `${crop.width} ${crop.height}`,
        backgroundPosition: `${crop.left} ${crop.top}`,
        opacity: crop.opacity,
        filter: crop.filter,
      }
    }
  }
}
