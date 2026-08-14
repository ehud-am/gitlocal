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

// Falls back to sourcing the user's shell profile (~/.zshrc, ~/.bashrc, nvm, etc.) when a plain
// PATH walk misses, since that's how a command typed into a Regular terminal tab actually
// resolves. Fails closed on any error/timeout — never treat a probe failure as "found".
function isCliAvailableViaLoginShell(command: string, platform: NodeJS.Platform): boolean {
  if (!LOGIN_SHELL_PROBE_PLATFORMS.has(platform)) return false
  const shell = process.env.SHELL || '/bin/sh'
  try {
    execFileSync(shell, ['-ilc', `command -v ${command}`], { timeout: 2000, stdio: ['ignore', 'pipe', 'ignore'] })
    return true
  } catch {
    return false
  }
}

export function detectCapabilities(): TerminalCapabilities {
  const platform = process.platform
  return {
    available: isPtySupported(),
    claudeCliFound: isCliAvailable('claude') || isCliAvailableViaLoginShell('claude', platform),
    codexCliFound: isCliAvailable('codex') || isCliAvailableViaLoginShell('codex', platform),
  }
}
