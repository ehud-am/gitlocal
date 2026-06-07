import { existsSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { homedir, platform } from 'node:os'
import type {
  StartupFolderPreference,
  StartupFolderResolution,
  StartupFolderUpdateSource,
} from '../types.js'

function defaultPreferencePath(): string {
  return process.env.GITLOCAL_STARTUP_PREFERENCE_PATH || join(homedir(), '.gitlocal', 'startup-folder.json')
}

function isReadableDirectory(path: string): boolean {
  try {
    return existsSync(path) && statSync(path).isDirectory()
  } catch {
    return false
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

export function getPlatformDocumentsPath(homePath = homedir(), env = process.env): string {
  if (platform() === 'linux') return getLinuxDocumentsPath(homePath, env)
  return join(homePath, 'Documents')
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
      fallbackReason: preference?.path ? 'Last used folder is unavailable.' : '',
    }
  }

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

export function rememberStartupFolder(folderPath: string, source: StartupFolderUpdateSource): void {
  try {
    writeStartupFolderPreference(folderPath, source)
  } catch {
    // Remembering the folder is ergonomic state; it must not block local browsing.
  }
}
