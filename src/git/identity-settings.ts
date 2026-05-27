import { accessSync, closeSync, constants, existsSync, openSync, readdirSync, readSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, isAbsolute, join, resolve } from 'node:path'
import type {
  SshKeyListResponse,
  SshKeyValidationResponse,
} from '../types.js'

const PRIVATE_KEY_HEADERS = [
  '-----BEGIN OPENSSH PRIVATE KEY-----',
  '-----BEGIN RSA PRIVATE KEY-----',
  '-----BEGIN DSA PRIVATE KEY-----',
  '-----BEGIN EC PRIVATE KEY-----',
  '-----BEGIN ECDSA PRIVATE KEY-----',
]

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
