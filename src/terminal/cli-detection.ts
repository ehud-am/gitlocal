import { accessSync, constants } from 'node:fs'
import { delimiter, join } from 'node:path'
import { execFileSync } from 'node:child_process'
import type { TerminalCapabilities } from './types.js'

// Platforms where node-pty can interactively spawn a real login shell to probe with, matching
// how Terminal.app itself would resolve a command. win32 keeps the raw-PATH-only behavior.
const LOGIN_SHELL_PROBE_PLATFORMS = new Set<NodeJS.Platform>(['darwin', 'linux'])

const SUPPORTED_PTY_PLATFORMS = new Set<NodeJS.Platform>(['darwin', 'linux', 'win32'])

export function isPtySupported(platform: NodeJS.Platform = process.platform): boolean {
  return SUPPORTED_PTY_PLATFORMS.has(platform)
}

function candidateNames(command: string, platform: NodeJS.Platform): string[] {
  if (platform !== 'win32') return [command]
  return [command, `${command}.cmd`, `${command}.exe`, `${command}.bat`, `${command}.ps1`]
}

// Walks PATH directories looking for an executable file, rather than spawning the command,
// so a pre-flight check never has a side effect (e.g. accidentally launching an interactive CLI).
export function isCliAvailable(
  command: string,
  pathEnv: string = process.env.PATH ?? '',
  platform: NodeJS.Platform = process.platform,
): boolean {
  const dirs = pathEnv.split(delimiter).filter(Boolean)
  for (const dir of dirs) {
    for (const name of candidateNames(command, platform)) {
      try {
        accessSync(join(dir, name), constants.X_OK)
        return true
      } catch {
        continue
      }
    }
  }
  return false
}

// Only ever called with the fixed literals 'claude'/'codex' today, but this guards the
// interpolation below against ever becoming a shell-injection vector if this helper is later
// generalized to an externally-influenced command name.
const SAFE_COMMAND_NAME = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/

// The login-shell probe (~/.zshrc, ~/.bashrc, nvm, etc.) spawns a real shell and can take up to
// its timeout to resolve, so results are cached briefly to avoid re-paying that cost on every
// terminal-tab-open/capabilities check. A short TTL still picks up a CLI installed mid-session.
const LOGIN_SHELL_PROBE_TTL_MS = 30_000
const loginShellProbeCache = new Map<string, { value: boolean; expiresAt: number }>()

export function resetLoginShellProbeCache(): void {
  loginShellProbeCache.clear()
}

function probeLoginShell(command: string): boolean {
  const shell = process.env.SHELL || '/bin/sh'
  try {
    execFileSync(shell, ['-ilc', `command -v -- '${command}'`], { timeout: 2000, stdio: ['ignore', 'pipe', 'ignore'] })
    return true
  } catch {
    return false
  }
}

// Falls back to sourcing the user's shell profile when a plain PATH walk misses, since that's
// how a command typed into a Regular terminal tab actually resolves. Fails closed on any
// error/timeout, unsupported platform, or unsafe command name — never treat a probe failure (or
// a name we won't interpolate into a shell string) as "found".
export function isCliAvailableViaLoginShell(command: string, platform: NodeJS.Platform): boolean {
  if (!LOGIN_SHELL_PROBE_PLATFORMS.has(platform)) return false
  if (!SAFE_COMMAND_NAME.test(command)) return false

  const cached = loginShellProbeCache.get(command)
  const now = Date.now()
  if (cached && cached.expiresAt > now) return cached.value

  const value = probeLoginShell(command)
  loginShellProbeCache.set(command, { value, expiresAt: now + LOGIN_SHELL_PROBE_TTL_MS })
  return value
}

export function detectCapabilities(): TerminalCapabilities {
  const platform = process.platform
  return {
    available: isPtySupported(),
    claudeCliFound: isCliAvailable('claude') || isCliAvailableViaLoginShell('claude', platform),
    codexCliFound: isCliAvailable('codex') || isCliAvailableViaLoginShell('codex', platform),
  }
}
