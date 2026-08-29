import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import SvgViewer from './SvgViewer'

const SAMPLE_SVG = '<svg xmlns="http://www.w3.org/2000/svg"><circle r="4" /></svg>'

function decodeDataUri(src: string): string {
  const base64 = src.replace('data:image/svg+xml;base64,', '')
  return decodeURIComponent(escape(atob(base64)))
}

describe('SvgViewer', () => {
  it('renders the SVG as a scaled graphic via a base64 data URI by default', () => {
    render(<SvgViewer content={SAMPLE_SVG} showRaw={false} />)
    const img = screen.getByRole('img')
    const src = img.getAttribute('src') ?? ''
    expect(src.startsWith('data:image/svg+xml;base64,')).toBe(true)
    expect(decodeDataUri(src)).toBe(SAMPLE_SVG)
  })

  it('renders the raw XML source via CodeViewer when showRaw is true', async () => {
    render(<SvgViewer content={SAMPLE_SVG} showRaw />)
    await waitFor(() => {
      expect(
        screen.getByText((_, element) => element?.tagName.toLowerCase() === 'code'
          && element.textContent?.includes('<svg') === true),
      ).toBeInTheDocument()
    }, { timeout: 5000 })
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('never executes a <script> embedded in the SVG content', () => {
    const malicious = '<svg xmlns="http://www.w3.org/2000/svg"><script>window.__svgScriptExecuted = true</script></svg>'
    render(<SvgViewer content={malicious} showRaw={false} />)
    expect((window as unknown as { __svgScriptExecuted?: boolean }).__svgScriptExecuted).toBeUndefined()
  })

  it("falls back to a message when the image fails to load (malformed content)", () => {
    render(<SvgViewer content="not actually svg" showRaw={false} />)
    const img = screen.getByRole('img')
    fireEvent.error(img)
    expect(screen.getByText("This SVG can't be previewed.")).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('resets a previous load failure when the file changes', () => {
    const { rerender } = render(<SvgViewer content="not actually svg" showRaw={false} />)
    fireEvent.error(screen.getByRole('img'))
    expect(screen.getByText("This SVG can't be previewed.")).toBeInTheDocument()

    rerender(<SvgViewer content={SAMPLE_SVG} showRaw={false} />)
    expect(screen.getByRole('img')).toBeInTheDocument()
    expect(screen.queryByText("This SVG can't be previewed.")).not.toBeInTheDocument()
  })
})
