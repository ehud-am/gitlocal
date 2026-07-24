import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./App', () => ({
  default: () => null,
}))

vi.mock('./services/theme', () => ({
  applyTheme: vi.fn(),
  getInitialTheme: vi.fn(() => 'light'),
}))

describe('main bootstrap', () => {
  beforeEach(() => {
    vi.resetModules()
    document.body.innerHTML = '<div id="root"></div>'
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('pins query focus permanently so a hidden/unfocused window never pauses query retries', async () => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })

    const { focusManager } = await import('@tanstack/react-query')
    await import('./main')

    // Regression guard: without this, a query that fails while the tab is backgrounded
    // (common in embedded/automated contexts, e.g. the macOS app's WKWebView right after
    // launch) gets stuck in fetchStatus 'paused' forever — neither loading nor erroring —
    // silently reproducing the empty-content bug this app must never show.
    expect(focusManager.isFocused()).toBe(true)
  })

  it('configures the QueryClient with networkMode "always" so queries never pause on perceived offline status', async () => {
    const { queryClient } = await import('./main')

    // Regression guard: without this, a query that fails while the browser's online
    // heuristic misfires (unreliable in embedded contexts like the macOS app's WKWebView)
    // gets stuck in fetchStatus 'paused' instead of settling to an error state.
    expect(queryClient.getDefaultOptions().queries?.networkMode).toBe('always')
  })
})
