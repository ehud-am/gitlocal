import type { Context } from 'hono'
import { classifyLocalPath } from '../git/repo.js'
import { detectCapabilities } from '../terminal/cli-detection.js'
import { sessionManager } from '../terminal/session-manager.js'
import type { CreateTerminalSessionRequest, TerminalKind } from '../terminal/types.js'

type Variables = { repoPath: string; pickerPath: string }

const VALID_KINDS: readonly TerminalKind[] = ['regular', 'claude', 'codex']

function isValidKind(value: unknown): value is TerminalKind {
  return typeof value === 'string' && (VALID_KINDS as readonly string[]).includes(value)
}

// US1 scope: every new session's cwd defaults to the repository root, re-validated through
// classifyLocalPath() rather than trusting the server's cached repoPath verbatim (defense in
// depth — the server, not the client, is the source of truth for where a shell may start).
// Following the currently-visible folder/file (contextPath/contextType) arrives in US5.
function resolveSessionCwd(repoPath: string): string {
  const classification = classifyLocalPath(repoPath)
  /* v8 ignore next 3 -- repoPath is always a validated, existing repository root by the time a request reaches this handler */
  if (!classification.exists || classification.pathType !== 'directory') {
    return repoPath
  }
  return classification.canonicalPath
}

export async function createTerminalSessionHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  let payload: CreateTerminalSessionRequest
  try {
    payload = await c.req.json<CreateTerminalSessionRequest>()
  } catch {
    return c.json({ error: 'Invalid JSON body.' }, 400)
  }

  if (!isValidKind(payload.kind)) {
    return c.json({ error: 'kind must be one of "regular", "claude", "codex".' }, 400)
  }

  const cwd = resolveSessionCwd(c.get('repoPath'))
  const result = await sessionManager.createSession({ kind: payload.kind, cwd })

  if (!result.ok) {
    return c.json({ error: result.error, message: result.message }, 503)
  }

  return c.json(result.session, 201)
}

export function listTerminalSessionsHandler(c: Context<{ Variables: Variables }>): Response {
  return c.json(sessionManager.listSessions(), 200)
}

export function closeTerminalSessionHandler(c: Context<{ Variables: Variables }>): Response {
  const closed = sessionManager.closeSession(c.req.param('id') ?? '')
  if (!closed) {
    return c.json({ error: 'Terminal session not found.' }, 404)
  }
  return c.body(null, 204)
}

export function terminalCapabilitiesHandler(c: Context<{ Variables: Variables }>): Response {
  return c.json(detectCapabilities(), 200)
}
