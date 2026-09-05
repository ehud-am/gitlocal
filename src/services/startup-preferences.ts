import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, parse as parsePath, resolve } from 'node:path'
import { homedir, platform, tmpdir } from 'node:os'
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

export function getLinuxDocumentsPath(homePath = homedir(), env = process.env): string {
  const configured = env.XDG_DOCUMENTS_DIR
  if (configured) {
    return configured.replace(/^~(?=\/|$)/, homePath)
  }
  return join(homePath, 'Documents')
}

function getPlatformDocumentsPath(homePath = homedir(), env = process.env): string {
  if (platform() === 'linux') return getLinuxDocumentsPath(homePath, env)
  return join(homePath, 'Documents')
}

// A directory that is always present and listable regardless of the user's own folder
// choices — the drive/filesystem root (`/` on macOS and Linux, `C:\` on Windows). Used only
// as the last resort after Documents, home, cwd, and the OS temp dir have all failed, so that
// GitLocal can never end up with no readable folder at all to fall back to.
function filesystemRootPath(fromPath: string): string {
  return parsePath(resolve(fromPath)).root
}

// Walks a chain of increasingly platform-guaranteed locations — Documents, home, the process's
// current working directory, the OS temp directory, and finally the filesystem root — returning
// the first one that is actually verified readable right now. Every step past "home" is chosen
// specifically because Node itself depends on it being available (cwd to have started at all,
// tmpdir for its own temp-file needs), so in practice this only fails in a wholly broken
// environment, and even then it returns the filesystem root path rather than nothing.
export function resolveGuaranteedFallbackPath(
  homePath = homedir(),
  env = process.env,
): { path: string; readable: boolean } {
  const candidates = [getPlatformDocumentsPath(homePath, env), homePath, process.cwd(), tmpdir(), filesystemRootPath(homePath)]

  for (const candidate of candidates) {
    if (candidate && isReadableDirectory(candidate)) {
      return { path: canonicalDirectory(candidate), readable: true }
    }
  }

  /* v8 ignore next 2 -- every candidate failing (including the filesystem root itself) is not practical to simulate in tests */
  const last = candidates[candidates.length - 1] ?? resolve('.')
  return { path: last, readable: false }
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
  env?: NodeJS.ProcessEnv
} = {}): StartupFolderResolution {
  const homePath = options.homePath ?? homedir()
  const platformDefaultPath = getPlatformDocumentsPath(homePath, options.env ?? process.env)
  const preference = readStartupFolderPreference(options.preferencePath ?? defaultPreferencePath())
  const explicitPath = options.explicitPath?.trim()

  if (explicitPath) {
    const exists = isReadableDirectory(explicitPath)
    return {
      path: exists ? canonicalDirectory(explicitPath) : resolve(explicitPath),
      source: 'explicit',
      exists,
      readable: exists,
      platformDefaultPath,
      lastUsedPath: preference?.path ?? '',
      fallbackReason: exists ? '' : 'Explicit folder is unavailable.',
    }
  }

  if (preference?.path && isReadableDirectory(preference.path)) {
    return {
      path: canonicalDirectory(preference.path),
      source: 'last-used',
      exists: true,
      readable: true,
      platformDefaultPath,
      lastUsedPath: preference.path,
      fallbackReason: '',
    }
  }

  if (isReadableDirectory(platformDefaultPath)) {
    return {
      path: canonicalDirectory(platformDefaultPath),
      source: 'platform-default',
      exists: true,
      readable: true,
      platformDefaultPath,
      lastUsedPath: preference?.path ?? '',
      fallbackReason: preference?.path ? describeUnreadableFolder(preference.path) : '',
    }
  }

  if (isReadableDirectory(homePath)) {
    return {
      path: canonicalDirectory(homePath),
      source: 'home-fallback',
      exists: true,
      readable: true,
      platformDefaultPath,
      lastUsedPath: preference?.path ?? '',
      fallbackReason: 'Platform Documents folder is unavailable.',
    }
  }

  // Both the platform Documents folder and the home directory have failed — fall further back
  // to a location that is virtually guaranteed to exist and be readable on every platform,
  // rather than returning an unreadable path with nowhere left to go (see resolveGuaranteedFallbackPath).
  const guaranteed = resolveGuaranteedFallbackPath(homePath, options.env ?? process.env)
  return {
    path: guaranteed.path,
    source: 'safe-fallback',
    exists: guaranteed.readable,
    readable: guaranteed.readable,
    platformDefaultPath,
    lastUsedPath: preference?.path ?? '',
    fallbackReason: 'Home folder is unavailable — opened a safe fallback location instead.',
  }
}

export function rememberStartupFolder(folderPath: string, source: StartupFolderUpdateSource): void {
  try {
    writeStartupFolderPreference(folderPath, source)
  } catch {
    // Remembering the folder is ergonomic state; it must not block local browsing.
  }
}
