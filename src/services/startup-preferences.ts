import { accessSync, constants, existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, parse as parsePath, resolve } from 'node:path'
import { homedir } from 'node:os'
import type {
  DefaultReaderPreference,
  DefaultReaderPreferenceStatus,
  DefaultReaderPreferenceUpdateRequest,
  StartupFolderPreference,
  StartupFolderResolution,
  StartupFolderUpdateSource,
} from '../types.js'

function defaultPreferencePath(): string {
  return process.env.GITLOCAL_STARTUP_PREFERENCE_PATH || join(homedir(), '.gitlocal', 'startup-folder.json')
}

function defaultReaderPreferencePath(): string {
  return process.env.GITLOCAL_DEFAULT_READER_PREFERENCE_PATH || join(homedir(), '.gitlocal', 'default-reader.json')
}

const DEFAULT_READER_PREFERENCE: DefaultReaderPreference = {
  status: 'not-asked',
  askedAt: '',
  answeredAt: '',
  message: '',
}

function normalizeDefaultReaderStatus(status: unknown): DefaultReaderPreferenceStatus {
  return status === 'accepted' || status === 'declined' || status === 'failed' || status === 'not-asked'
    ? status
    : 'not-asked'
}

export function isReadableDirectory(path: string): boolean {
  try {
    if (!existsSync(path) || !statSync(path).isDirectory()) return false
    readdirSync(path)
    return true
  } catch {
    return false
  }
}

// A cheaper liveness probe for a hot path (checked on every /api/info request) that only
// needs to know "is this still a directory I can access" — not an actual listing. `accessSync`
// checks the read+execute permission bits without reading directory contents, unlike
// `isReadableDirectory`'s `readdirSync`, which is unnecessary work to repeat on every request
// for what's usually a perfectly healthy, unchanged folder. Still correctly reports "gone" or
// "permission denied" — the two failure modes that actually matter for this check.
export function isAccessibleDirectory(path: string): boolean {
  try {
    if (!statSync(path).isDirectory()) return false
    accessSync(path, constants.R_OK | constants.X_OK)
    return true
  } catch {
    return false
  }
}

function describeUnreadableFolder(path: string): string {
  if (!existsSync(path)) return 'Last used folder no longer exists.'
  try {
    readdirSync(path)
    return 'Last used folder is unavailable.'
  } catch (err) {
    const code = (err as NodeJS.ErrnoException | undefined)?.code
    if (code === 'EACCES' || code === 'EPERM') return 'Last used folder is no longer accessible (permission denied).'
    /* v8 ignore next -- other errno codes (e.g. a disconnected network drive) are not practical to simulate in tests */
    return 'Last used folder is currently unreachable — it may be on a disconnected drive.'
  }
}

function canonicalDirectory(path: string): string {
  return realpathSync(resolve(path))
}

// A directory that is always present and listable regardless of the user's own folder
// choices — the drive/filesystem root (`/` on macOS and Linux, `C:\` on Windows). Used only
// as the last resort when the home directory itself is unreadable, so GitLocal can never end
// up with no readable folder at all to fall back to.
function filesystemRootPath(fromPath: string): string {
  return parsePath(resolve(fromPath)).root
}

// The single OS-default fallback location, used whenever explicit-path resolution, last-used
// resolution, or a direct file-open all fail for any reason — so there is exactly one safe
// outcome for every kind of startup failure, not several differently-named fallback tiers that
// can each drift out of sync. Tries the home directory first; if that is itself unreadable
// (a wholly broken environment), falls through exactly once to the filesystem root, which Node
// itself depends on being listable, rather than returning nothing.
export function resolveOsDefaultLocation(homePath = homedir()): { path: string; readable: boolean } {
  if (isReadableDirectory(homePath)) {
    return { path: canonicalDirectory(homePath), readable: true }
  }
  const root = filesystemRootPath(homePath)
  /* v8 ignore next -- the filesystem root itself being unreadable is not practical to simulate in tests */
  return isReadableDirectory(root) ? { path: canonicalDirectory(root), readable: true } : { path: root, readable: false }
}

// Every "landed on the OS default" call site (initial startup, a mid-session self-heal, or a
// parent-folder walk that ran out of readable ancestors) builds the same StartupFolderResolution
// shape — only the fallback location, the explanatory reason, and the last-used path to carry
// forward differ. Sharing this in one place means a future change to the shape only needs to
// happen once.
export function buildSafeFallbackResolution(
  fallback: { path: string; readable: boolean },
  fallbackReason: string,
  carryForward: { lastUsedPath: string },
): StartupFolderResolution {
  return {
    path: fallback.path,
    source: 'os-default',
    exists: fallback.readable,
    readable: fallback.readable,
    lastUsedPath: carryForward.lastUsedPath,
    fallbackReason,
  }
}

export function readStartupFolderPreference(path = defaultPreferencePath()): StartupFolderPreference | null {
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf-8')) as Partial<StartupFolderPreference>
    if (!parsed.path || !parsed.openedAt || !parsed.source) return null
    return {
      path: parsed.path,
      openedAt: parsed.openedAt,
      source: parsed.source,
    }
  } catch {
    return null
  }
}

export function readDefaultReaderPreference(path = defaultReaderPreferencePath()): DefaultReaderPreference {
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf-8')) as Partial<DefaultReaderPreference>
    return {
      status: normalizeDefaultReaderStatus(parsed.status),
      askedAt: typeof parsed.askedAt === 'string' ? parsed.askedAt : '',
      answeredAt: typeof parsed.answeredAt === 'string' ? parsed.answeredAt : '',
      message: typeof parsed.message === 'string' ? parsed.message : '',
    }
  } catch {
    return { ...DEFAULT_READER_PREFERENCE }
  }
}

export function writeDefaultReaderPreference(
  update: DefaultReaderPreferenceUpdateRequest,
  path = defaultReaderPreferencePath(),
): DefaultReaderPreference {
  const current = readDefaultReaderPreference(path)
  const now = new Date().toISOString()
  const status = normalizeDefaultReaderStatus(update.status)
  const askedAt = update.askedAt ?? current.askedAt
  const preference: DefaultReaderPreference = {
    status,
    askedAt: askedAt || (status === 'not-asked' ? '' : now),
    answeredAt: update.answeredAt ?? (status === 'not-asked' ? '' : now),
    message: update.message ?? current.message ?? '',
  }

  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(preference, null, 2)}\n`)
  return preference
}

export function writeStartupFolderPreference(
  folderPath: string,
  source: StartupFolderUpdateSource,
  path = defaultPreferencePath(),
): StartupFolderPreference {
  if (!isReadableDirectory(folderPath)) {
    throw new Error(`Startup folder is not available: ${folderPath}`)
  }
  const canonicalPath = canonicalDirectory(folderPath)

  const preference: StartupFolderPreference = {
    path: canonicalPath,
    openedAt: new Date().toISOString(),
    source,
  }
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(preference, null, 2)}\n`)
  return preference
}

export function resolveStartupFolder(options: {
  explicitPath?: string
  preferencePath?: string
  homePath?: string
} = {}): StartupFolderResolution {
  const homePath = options.homePath ?? homedir()
  const preference = readStartupFolderPreference(options.preferencePath ?? defaultPreferencePath())
  const explicitPath = options.explicitPath?.trim()

  if (explicitPath && isReadableDirectory(explicitPath)) {
    return {
      path: canonicalDirectory(explicitPath),
      source: 'explicit',
      exists: true,
      readable: true,
      lastUsedPath: preference?.path ?? '',
      fallbackReason: '',
    }
  }

  if (!explicitPath && preference?.path && isReadableDirectory(preference.path)) {
    return {
      path: canonicalDirectory(preference.path),
      source: 'last-used',
      exists: true,
      readable: true,
      lastUsedPath: preference.path,
      fallbackReason: '',
    }
  }

  // Every other case — an explicit path that doesn't exist or isn't readable, no remembered
  // folder, or a remembered folder that is itself no longer readable — converges here on the
  // single OS-default location (FR-007), rather than each failure computing its own fallback.
  const fallback = resolveOsDefaultLocation(homePath)
  const fallbackReason = explicitPath
    ? 'Explicit folder is unavailable — opened a default location instead.'
    : preference?.path
      ? `${describeUnreadableFolder(preference.path)} Opened a default location instead.`
      : ''
  return {
    path: fallback.path,
    source: 'os-default',
    exists: fallback.readable,
    readable: fallback.readable,
    lastUsedPath: preference?.path ?? '',
    fallbackReason,
  }
}

export function rememberStartupFolder(folderPath: string, source: StartupFolderUpdateSource): void {
  try {
    writeStartupFolderPreference(folderPath, source)
  } catch {
    // Remembering the folder is ergonomic state; it must not block local browsing.
  }
}
