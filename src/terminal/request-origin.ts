// A terminal session runs arbitrary commands, so its endpoints only answer requests that come
// from GitLocal's own loopback origin. The server listens on 127.0.0.1, but that alone doesn't
// stop a web page from reaching it: WebSockets aren't covered by CORS (any site can open one to
// 127.0.0.1 and would only need a session id), and a DNS-rebinding page is same-origin with the
// server under its own hostname. Checking Host and Origin closes both.
const LOOPBACK_HOSTNAMES = new Set(['127.0.0.1', 'localhost', '[::1]'])

function hostnameOf(hostHeader: string): string {
  const host = hostHeader.trim().toLowerCase()
  if (host.startsWith('[')) return host.slice(0, host.indexOf(']') + 1)
  return host.split(':')[0]
}

// Requests without a Host header don't come from a browser (browsers always send one).
export function isLoopbackHostHeader(hostHeader: string | undefined): boolean {
  if (hostHeader === undefined) return true
  return LOOPBACK_HOSTNAMES.has(hostnameOf(hostHeader))
}

// Browsers send Origin on WebSocket upgrades and on cross-origin or non-GET fetches; a request
// without one is a same-origin navigation/GET or a non-browser client.
export function isLoopbackOrigin(origin: string | undefined): boolean {
  if (origin === undefined) return true
  try {
    return LOOPBACK_HOSTNAMES.has(new URL(origin).hostname)
  } catch {
    return false
  }
}

export function isTrustedTerminalRequest(hostHeader: string | undefined, origin: string | undefined): boolean {
  return isLoopbackHostHeader(hostHeader) && isLoopbackOrigin(origin)
}
