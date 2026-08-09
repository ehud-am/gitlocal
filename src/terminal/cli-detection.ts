import { accessSync, constants } from 'node:fs'
import { delimiter, join } from 'node:path'
import type { TerminalCapabilities } from './types.js'

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

export function detectCapabilities(): TerminalCapabilities {
  return {
    available: isPtySupported(),
    claudeCliFound: isCliAvailable('claude'),
    codexCliFound: isCliAvailable('codex'),
  }
}
