import type { Context } from 'hono'
import {
  isValidDockPosition,
  readTerminalPanelPreference,
  writeTerminalPanelPreference,
} from '../services/terminal-panel-preference.js'
import type { TerminalPanelPreference } from '../types.js'

export function getTerminalPanelPreferenceHandler(c: Context): Response {
  return c.json(readTerminalPanelPreference())
}

export async function updateTerminalPanelPreferenceHandler(c: Context): Promise<Response> {
  let payload: Partial<TerminalPanelPreference>
  try {
    payload = await c.req.json<Partial<TerminalPanelPreference>>()
  } catch {
    return c.json({ error: 'Invalid dockPosition' }, 400)
  }

  if (!isValidDockPosition(payload.dockPosition)) {
    return c.json({ error: 'Invalid dockPosition' }, 400)
  }

  return c.json(writeTerminalPanelPreference(payload.dockPosition))
}
