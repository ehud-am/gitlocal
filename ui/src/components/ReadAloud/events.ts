// Window events that connect the read-aloud settings dialog (opened from the View options menu or
// the macOS View menu) with a player bar that may be reading at the same time.
import type { ReadAloudPreference } from '../../services/readAloudApi'

export const OPEN_READ_ALOUD_SETTINGS_EVENT = 'gitlocal:open-read-aloud-settings'
export const READ_ALOUD_PREFERENCE_EVENT = 'gitlocal:read-aloud-preference'

export function openReadAloudSettings(): void {
  window.dispatchEvent(new Event(OPEN_READ_ALOUD_SETTINGS_EVENT))
}

export function announceReadAloudPreference(preference: ReadAloudPreference): void {
  window.dispatchEvent(new CustomEvent<ReadAloudPreference>(READ_ALOUD_PREFERENCE_EVENT, { detail: preference }))
}
