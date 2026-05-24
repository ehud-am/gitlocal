import { accessSync, closeSync, constants, existsSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, readSync, statSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { homedir } from 'node:os'
import { basename, dirname, isAbsolute, join, resolve } from 'node:path'
import type {
  PrivateSettingsProtectionState,
  SshKeyListResponse,
  SshKeyValidationResponse,
} from '../types.js'

const SETTINGS_FILE = '.env'
const IGNORE_FILE = '.gitignore'
const IDENTITY_NAME_KEY = 'GITLOCAL_GIT_NAME'
const IDENTITY_EMAIL_KEY = 'GITLOCAL_GIT_EMAIL'
const IDENTITY_SSH_KEY_PATH_KEY = 'GITLOCAL_GIT_SSH_KEY_PATH'
const PRIVATE_KEY_HEADERS = [
  '-----BEGIN OPENSSH PRIVATE KEY-----',
  '-----BEGIN RSA PRIVATE KEY-----',
  '-----BEGIN DSA PRIVATE KEY-----',
  '-----BEGIN EC PRIVATE KEY-----',
  '-----BEGIN ECDSA PRIVATE KEY-----',
]

export interface PrivateIdentitySettings {
  name?: string
  email?: string
  sshKeyPath?: string
}

function quoteEnvValue(value: string): string {
  return JSON.stringify(value)
}

function unquoteEnvValue(value: string): string {
  const trimmed = value.trim()
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    if (trimmed.startsWith('"')) {
      try {
        return JSON.parse(trimmed) as string
      } catch {
        return trimmed.slice(1, -1)
      }
    }
    return trimmed.slice(1, -1)
  }
  return trimmed
}

function parseEnv(content: string): Map<string, string> {
  const values = new Map<string, string>()
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (match) values.set(match[1], unquoteEnvValue(match[2]))
  }
  return values
}

function settingsPath(repoPath: string): string {
  return join(repoPath, SETTINGS_FILE)
}

function ignorePath(repoPath: string): string {
  return join(repoPath, IGNORE_FILE)
}

export function expandUserPath(inputPath: string): string {
  const trimmed = inputPath.trim()
  if (trimmed === '~') return homedir()
  if (trimmed.startsWith('~/') || trimmed.startsWith('~\\')) return join(homedir(), trimmed.slice(2))
  return trimmed
}

export function resolveSshPath(inputPath: string): string {
  const expanded = expandUserPath(inputPath)
  return isAbsolute(expanded) ? expanded : resolve(expanded)
}

export function getConventionalSshDirectory(): string {
  const home = homedir()
  if (!home) return ''
  return join(home, '.ssh')
}

export function validateSshPrivateKeyPath(inputPath: string): SshKeyValidationResponse {
  const path = inputPath.trim()
  if (!path) {
    return { valid: false, path, message: 'SSH key path is required.' }
  }

  const resolvedPath = resolveSshPath(path)
  try {
    const stats = statSync(resolvedPath)
    if (!stats.isFile()) {
      return { valid: false, path, message: 'Selected path is not a file.' }
    }
    accessSync(resolvedPath, constants.R_OK)
    const fd = openSync(resolvedPath, 'r')
    const buffer = Buffer.alloc(4096)
    const bytesRead = readSync(fd, buffer, 0, buffer.length, 0)
    closeSync(fd)
    const prefix = buffer.subarray(0, bytesRead).toString('utf-8')
    if (!PRIVATE_KEY_HEADERS.some((header) => prefix.includes(header))) {
      return { valid: false, path, message: 'Selected file is not a valid SSH private key.' }
    }
    return { valid: true, path, message: 'SSH private key is valid.' }
  } catch {
    return { valid: false, path, message: 'SSH private key file could not be read.' }
  }
}

export function listSshPrivateKeys(): SshKeyListResponse {
  const directoryPath = getConventionalSshDirectory()
  /* v8 ignore next 7 -- os.homedir is expected to resolve in supported local runtime environments */
  if (!directoryPath) {
    return {
      directory: { path: '', exists: false, readable: false },
      keys: [],
      message: 'No conventional SSH key folder was found. Enter a key path manually.',
    }
  }

  if (!existsSync(directoryPath)) {
    return {
      directory: { path: directoryPath, exists: false, readable: false },
      keys: [],
      message: 'No conventional SSH key folder was found. Enter a key path manually.',
    }
  }

  try {
    const stats = statSync(directoryPath)
    if (!stats.isDirectory()) {
      return {
        directory: { path: directoryPath, exists: true, readable: false },
        keys: [],
        message: 'The conventional SSH key path is not a folder. Enter a key path manually.',
      }
    }

    const keys = readdirSync(directoryPath, { withFileTypes: true })
      .filter((entry) => entry.isFile() || entry.isSymbolicLink())
      .map((entry) => join(directoryPath, entry.name))
      .filter((candidatePath) => validateSshPrivateKeyPath(candidatePath).valid)
      .map((candidatePath) => ({ name: basename(candidatePath), path: candidatePath }))
      .sort((a, b) => a.name.localeCompare(b.name))

    return {
      directory: { path: directoryPath, exists: true, readable: true },
      keys,
      message: keys.length === 1 ? 'Found 1 SSH private key.' : `Found ${keys.length} SSH private keys.`,
    }
  /* v8 ignore next -- unreadable home SSH directory depends on host filesystem permissions */
  } catch {
    return {
      directory: { path: directoryPath, exists: true, readable: false },
      keys: [],
      message: 'The conventional SSH key folder could not be read. Enter a key path manually.',
    }
  }
}

export function readPrivateIdentitySettings(repoPath: string): PrivateIdentitySettings {
  try {
    const values = parseEnv(readFileSync(settingsPath(repoPath), 'utf-8'))
    const settings: PrivateIdentitySettings = {}
    if (values.has(IDENTITY_NAME_KEY)) settings.name = values.get(IDENTITY_NAME_KEY) || ''
    if (values.has(IDENTITY_EMAIL_KEY)) settings.email = values.get(IDENTITY_EMAIL_KEY) || ''
    if (values.has(IDENTITY_SSH_KEY_PATH_KEY)) settings.sshKeyPath = values.get(IDENTITY_SSH_KEY_PATH_KEY) || ''
    return settings
  } catch {
    return {}
  }
}

function upsertEnvLine(lines: string[], key: string, value: string): string[] {
  const line = `${key}=${quoteEnvValue(value)}`
  const index = lines.findIndex((entry) => entry.match(new RegExp(`^\\s*${key}=`)))
  if (index >= 0) {
    const next = [...lines]
    next[index] = line
    return next
  }
  return [...lines, line]
}

export function writePrivateIdentitySettings(repoPath: string, settings: PrivateIdentitySettings): void {
  const filePath = settingsPath(repoPath)
  let lines: string[] = []
  try {
    lines = readFileSync(filePath, 'utf-8').split(/\r?\n/)
    if (lines.at(-1) === '') lines = lines.slice(0, -1)
  } catch {
    lines = []
  }

  lines = upsertEnvLine(lines, IDENTITY_NAME_KEY, settings.name || '')
  lines = upsertEnvLine(lines, IDENTITY_EMAIL_KEY, settings.email || '')
  lines = upsertEnvLine(lines, IDENTITY_SSH_KEY_PATH_KEY, settings.sshKeyPath || '')
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, `${lines.join('\n')}\n`)
}

function ignoreContentCoversEnv(content: string): boolean {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .some((line) => line === '.env' || line === '/.env' || line === '.env*' || line === '.env.*' || line === '*.env')
}

function runGit(repoPath: string, ...args: string[]): { status: number; stdout: string } {
  const result = spawnSync('git', args, { cwd: repoPath, encoding: 'utf-8' })
  return { status: result.status ?? 1, stdout: result.stdout ?? '' }
}

function isSettingsFileTracked(repoPath: string): boolean {
  return runGit(repoPath, 'ls-files', '--error-unmatch', SETTINGS_FILE).status === 0
}

function isSettingsFileIgnoredByGit(repoPath: string): boolean {
  return runGit(repoPath, 'check-ignore', '-q', SETTINGS_FILE).status === 0
}

export function getPrivateSettingsProtection(repoPath: string): PrivateSettingsProtectionState {
  const filePath = ignorePath(repoPath)
  if (isSettingsFileTracked(repoPath)) {
    return {
      settingsPath: SETTINGS_FILE,
      ignoreFileExists: existsSync(filePath),
      protected: false,
      status: 'blocked',
      canApplyFix: false,
      message: '.env is already tracked by git. Remove it from git tracking before saving private identity settings.',
    }
  }

  if (!existsSync(filePath)) {
    return {
      settingsPath: SETTINGS_FILE,
      ignoreFileExists: false,
      protected: false,
      status: 'missing-ignore-file',
      canApplyFix: true,
      message: '.env is not ignored. Create .gitignore before committing private settings.',
    }
  }

  try {
    const stats = lstatSync(filePath)
    if (!stats.isFile()) throw new Error('not-file')
    const content = readFileSync(filePath, 'utf-8')
    const protectedByIgnore = ignoreContentCoversEnv(content) && isSettingsFileIgnoredByGit(repoPath)
    return protectedByIgnore
      ? {
          settingsPath: SETTINGS_FILE,
          ignoreFileExists: true,
          protected: true,
          status: 'protected',
          canApplyFix: false,
          message: '.env is protected by .gitignore.',
        }
      : {
          settingsPath: SETTINGS_FILE,
          ignoreFileExists: true,
          protected: false,
          status: 'missing-entry',
          canApplyFix: true,
          message: '.env is not ignored. Add it to .gitignore before committing private settings.',
        }
  } catch {
    return {
      settingsPath: SETTINGS_FILE,
      ignoreFileExists: true,
      protected: false,
      status: 'blocked',
      canApplyFix: false,
      message: 'Could not read .gitignore to confirm .env protection.',
    }
  }
}

export function applyPrivateSettingsProtection(repoPath: string, approved: boolean): PrivateSettingsProtectionState {
  if (!approved) {
    return {
      settingsPath: SETTINGS_FILE,
      ignoreFileExists: existsSync(ignorePath(repoPath)),
      protected: false,
      status: 'blocked',
      canApplyFix: false,
      message: 'User approval is required before updating .gitignore.',
    }
  }

  const current = getPrivateSettingsProtection(repoPath)
  if (current.protected || current.status === 'blocked') return current

  const filePath = ignorePath(repoPath)
  try {
    const existing = existsSync(filePath) ? readFileSync(filePath, 'utf-8') : ''
    const prefix = existing && !existing.endsWith('\n') ? '\n' : ''
    writeFileSync(filePath, `${existing}${prefix}.env\n`)
    const next = getPrivateSettingsProtection(repoPath)
    return next.protected
      ? {
          ...next,
          message: current.ignoreFileExists ? '.env was added to .gitignore.' : '.gitignore was created with .env protection.',
        }
      : next
  } catch {
    return {
      settingsPath: SETTINGS_FILE,
      ignoreFileExists: existsSync(filePath),
      protected: false,
      status: 'blocked',
      canApplyFix: false,
      message: 'Could not update .gitignore because the repository root is not writable.',
    }
  }
}
