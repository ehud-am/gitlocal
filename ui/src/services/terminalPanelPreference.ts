import type { DockPosition, TerminalPanelPreference } from '../types'

const BASE = ''
const PREFERENCE_URL = BASE + '/api/terminal-panel-preference'

export const terminalPanelPreferenceApi = {
  get: async (): Promise<DockPosition> => {
    const res = await fetch(PREFERENCE_URL)
    if (!res.ok) return 'right'
    const body = (await res.json().catch(() => null)) as Partial<TerminalPanelPreference> | null
    return body?.dockPosition ?? 'right'
  },

  set: async (dockPosition: DockPosition): Promise<DockPosition> => {
    const res = await fetch(PREFERENCE_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dockPosition } satisfies TerminalPanelPreference),
    })
    if (!res.ok) return dockPosition
    const body = (await res.json().catch(() => null)) as Partial<TerminalPanelPreference> | null
    return body?.dockPosition ?? dockPosition
  },
}
