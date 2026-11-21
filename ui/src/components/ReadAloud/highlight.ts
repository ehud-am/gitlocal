// Highlights the sentence being read. Uses the CSS Custom Highlight API where it exists and the
// range is in the main document; otherwise (older browsers, the sandboxed HTML preview frame)
// draws overlay boxes from the range's client rects.
export const HIGHLIGHT_NAME = 'read-aloud-sentence'

interface HighlightRegistry {
  set(name: string, highlight: unknown): void
  delete(name: string): void
}
type HighlightConstructor = new (...ranges: Range[]) => unknown

function highlightApi(doc: Document): { registry: HighlightRegistry; Highlight: HighlightConstructor } | null {
  const view = doc.defaultView as (Window & { Highlight?: HighlightConstructor; CSS?: { highlights?: HighlightRegistry } }) | null
  const registry = view?.CSS?.highlights
  const Highlight = view?.Highlight
  return registry && Highlight ? { registry, Highlight } : null
}

export class SentenceHighlighter {
  private range: Range | null = null
  private overlay: HTMLDivElement | null = null
  private readonly reposition = () => this.drawOverlay()

  constructor(private readonly doc: Document = document) {}

  show(range: Range | null): void {
    this.clear()
    if (!range) return
    this.range = range
    const api = range.startContainer.ownerDocument === this.doc ? highlightApi(this.doc) : null
    if (api) {
      api.registry.set(HIGHLIGHT_NAME, new api.Highlight(range))
    } else {
      this.overlay = this.doc.createElement('div')
      this.overlay.className = 'read-aloud-overlay'
      this.overlay.setAttribute('aria-hidden', 'true')
      this.doc.body.appendChild(this.overlay)
      this.drawOverlay()
      this.doc.defaultView?.addEventListener('scroll', this.reposition, true)
      this.doc.defaultView?.addEventListener('resize', this.reposition)
      range.startContainer.ownerDocument?.defaultView?.addEventListener('scroll', this.reposition, true)
    }
    scrollRangeIntoView(range)
  }

  clear(): void {
    highlightApi(this.doc)?.registry.delete(HIGHLIGHT_NAME)
    if (this.overlay) {
      this.doc.defaultView?.removeEventListener('scroll', this.reposition, true)
      this.doc.defaultView?.removeEventListener('resize', this.reposition)
      this.range?.startContainer.ownerDocument?.defaultView?.removeEventListener('scroll', this.reposition, true)
      this.overlay.remove()
      this.overlay = null
    }
    this.range = null
  }

  private drawOverlay(): void {
    if (!this.overlay || !this.range || typeof this.range.getClientRects !== 'function') return
    const frame = this.range.startContainer.ownerDocument?.defaultView?.frameElement
    const offset = frame && frame.ownerDocument === this.doc ? frame.getBoundingClientRect() : { left: 0, top: 0 }
    this.overlay.replaceChildren(
      ...Array.from(this.range.getClientRects(), (rect) => {
        const box = this.doc.createElement('div')
        box.className = 'read-aloud-overlay-rect'
        box.style.left = `${rect.left + offset.left}px`
        box.style.top = `${rect.top + offset.top}px`
        box.style.width = `${rect.width}px`
        box.style.height = `${rect.height}px`
        return box
      }),
    )
  }
}

function scrollRangeIntoView(range: Range): void {
  const node = range.startContainer
  const element = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement
  const view = node.ownerDocument?.defaultView
  if (!element || !view || typeof element.scrollIntoView !== 'function' || typeof range.getBoundingClientRect !== 'function') return
  const rect = range.getBoundingClientRect()
  if (rect.top >= 0 && rect.bottom <= view.innerHeight) return
  element.scrollIntoView({ block: 'center', behavior: 'smooth' })
}
