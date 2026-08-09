import { dirname } from 'node:path'
import type { Context } from 'hono'
import { classifyLocalPath, resolveSafeRepoPath } from '../git/repo.js'
import { detectCapabilities } from '../terminal/cli-detection.js'
import { sessionManager } from '../terminal/session-manager.js'
import type { CreateTerminalSessionRequest, TerminalContextType, TerminalKind } from '../terminal/types.js'

type Variables = { repoPath: string; pickerPath: string }

const VALID_KINDS: readonly TerminalKind[] = ['regular', 'claude', 'codex']

function isValidKind(value: unknown): value is TerminalKind {
  return typeof value === 'string' && (VALID_KINDS as readonly string[]).includes(value)
}

function cliUnavailableMessage(kind: TerminalKind): string {
  const cliName = kind === 'claude' ? 'Claude Code' : 'Codex'
  const command = kind === 'claude' ? 'claude' : 'codex'
  return `The ${cliName} CLI ("${command}") was not found on PATH. Install it to use a ${cliName} terminal.`
}

function resolveRepoRootCwd(repoPath: string): string {
  const classification = classifyLocalPath(repoPath)
  /* v8 ignore next 3 -- repoPath is always a validated, existing repository root by the time a request reaches this handler */
  if (!classification.exists || classification.pathType !== 'directory') {
    return repoPath
  }
  return classification.canonicalPath
}

// FR-011: a new tab's cwd defaults to whatever folder/file is currently visible — re-validated
// server-side via resolveSafeRepoPath()/classifyLocalPath() rather than trusting the client's
// contextPath verbatim (same defense-in-depth boundary as resolveRepoRootCwd). Edge Cases: if the
// resolved target has since been deleted/renamed/moved, walk up to the nearest still-existing
// ancestor within the repo, falling all the way back to the repository root if none is found.
function resolveSessionCwd(repoPath: string, contextPath?: string, contextType?: TerminalContextType): string {
  if (!contextPath || !contextType || contextType === 'none') {
    return resolveRepoRootCwd(repoPath)
  }

  const safePath = resolveSafeRepoPath(repoPath, contextPath)
  if (!safePath) {
    return resolveRepoRootCwd(repoPath)
  }

  let candidate = contextType === 'file' ? dirname(safePath) : safePath
  while (candidate !== repoPath) {
    const classification = classifyLocalPath(candidate)
    if (classification.exists && classification.pathType === 'directory') {
      return classification.canonicalPath
    }
    const parent = dirname(candidate)
    /* v8 ignore next -- dirname only reaches a fixed point at the filesystem root, which the repoPath bound above always precedes */
    if (parent === candidate) break
    candidate = parent
  }
  return resolveRepoRootCwd(repoPath)
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

  // FR-010: pre-flight the CLI's presence before spawning anything, so a missing claude/codex
  // installation produces a deterministic 503 instead of a shell reporting "command not found".
  if (payload.kind !== 'regular') {
    const capabilities = detectCapabilities()
    const found = payload.kind === 'claude' ? capabilities.claudeCliFound : capabilities.codexCliFound
    if (!found) {
      return c.json({ error: 'cli_not_found', message: cliUnavailableMessage(payload.kind) }, 503)
    }
  }

  const cwd = resolveSessionCwd(c.get('repoPath'), payload.contextPath, payload.contextType)
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
