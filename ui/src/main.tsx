import React from 'react'
import ReactDOM from 'react-dom/client'
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { applyTheme, getInitialTheme } from './services/theme'
import './styles/globals.css'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      // GitLocal only ever talks to its own local server (127.0.0.1), never the public
      // internet, so the browser's general online/offline heuristic is meaningless here —
      // and unreliable in embedded contexts (e.g. the macOS app's WKWebView) where
      // navigator.onLine can be stuck reporting offline right after launch. Without this,
      // a query that fails while the browser believes it's offline gets stuck in a
      // "pending, not fetching" limbo (fetchStatus: 'paused') that is neither loading nor
      // errored — silently reproducing the empty-content bug this app must never show.
      networkMode: 'always',
    },
  },
})

// Same rationale as networkMode above: query retries also pause while the window is
// considered unfocused/hidden, which is unreliable in embedded/automated contexts and
// pointless for an app whose only "network" is its own local server. Pin focus permanently
// so a failed request always settles to an error state instead of pausing indefinitely.
focusManager.setFocused(true)

applyTheme(getInitialTheme())

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
)
