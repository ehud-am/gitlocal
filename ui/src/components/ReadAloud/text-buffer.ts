// Collects the text of several DOM text nodes into one string while remembering where each node
// sits in it, so a slice of the string (a sentence) can be turned back into a DOM Range.
interface Segment {
  node: Text
  start: number
  end: number
}

export class TextBuffer {
  text = ''
  private readonly segments: Segment[] = []

  appendNode(node: Text): void {
    const start = this.text.length
    this.text += node.data
    this.segments.push({ node, start, end: this.text.length })
  }

  appendSeparator(separator = ' '): void {
    this.text += separator
  }

  get isEmpty(): boolean {
    return this.text.trim().length === 0
  }

  // A Range covering text[start, end). Separators between nodes map to the nearest node edge.
  rangeFor(start: number, end: number): Range | null {
    const first = this.segments.find((segment) => segment.end > start)
    const last = [...this.segments].reverse().find((segment) => segment.start < end)
    if (!first || !last || first.start >= end) return null
    const range = first.node.ownerDocument.createRange()
    range.setStart(first.node, Math.max(0, start - first.start))
    range.setEnd(last.node, Math.min(last.node.length, end - last.start))
    return range
  }
}
