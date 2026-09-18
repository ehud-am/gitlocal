import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'
import type { TerminalDockPosition, TerminalPanelPreference } from '../types.js'

const VALID_DOCK_POSITIONS: readonly TerminalDockPosition[] = ['bottom', 'left', 'right']

export const DEFAULT_TERMINAL_DOCK_POSITION: TerminalDockPosition = 'right'

export function isValidDockPosition(value: unknown): value is TerminalDockPosition {
  return typeof value === 'string' && (VALID_DOCK_POSITIONS as readonly string[]).includes(value)
}

function defaultPreferencePath(): string {
  return process.env.GITLOCAL_TERMINAL_PANEL_PREFERENCE_PATH || join(homedir(), '.gitlocal', 'terminal-panel-preference.json')
}

// Missing, corrupt, or unreadable is always "no preference set" rather than an error, matching
// src/services/startup-preferences.ts's readStartupFolderPreference — the default is never
// written to disk until the user explicitly changes it (data-model.md).
export function readTerminalPanelPreference(path = defaultPreferencePath()): TerminalPanelPreference {
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf-8')) as Partial<TerminalPanelPreference>
    if (isValidDockPosition(parsed.dockPosition)) {
      return { dockPosition: parsed.dockPosition }
    }
    return { dockPosition: DEFAULT_TERMINAL_DOCK_POSITION }
  } catch {
    return { dockPosition: DEFAULT_TERMINAL_DOCK_POSITION }
  }
}

export function writeTerminalPanelPreference(
  dockPosition: TerminalDockPosition,
  path = defaultPreferencePath(),
): TerminalPanelPreference {
  const preference: TerminalPanelPreference = { dockPosition }
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(preference, null, 2)}\n`)
  return preference
}
