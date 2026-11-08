import { chmodSync, statSync } from 'node:fs'
import { join } from 'node:path'

// node-pty starts every macOS shell through a small `spawn-helper` executable. The 1.1.0
// package tarball ships the prebuilt darwin helpers without the execute bit (mode 0644), so
// posix_spawn fails ("posix_spawnp failed") and no terminal can start. GitLocal's postinstall
// used to repair this only by rebuilding node-pty from source, which needs a C++ toolchain and
// is skipped entirely when install scripts don't run. Restoring the execute bit is enough.
export function spawnHelperCandidates(packageDir: string, platform: NodeJS.Platform, arch: string): string[] {
  if (platform === 'win32') return []
  return [
    join(packageDir, 'build', 'Release', 'spawn-helper'),
    join(packageDir, 'build', 'Debug', 'spawn-helper'),
    join(packageDir, 'prebuilds', `${platform}-${arch}`, 'spawn-helper'),
  ]
}

// Returns the helpers whose execute bit was restored. Missing files are skipped; a helper that
// can't be changed (a read-only install) is reported and left for the spawn to fail as before.
export function ensureSpawnHelperExecutable(
  packageDir: string,
  platform: NodeJS.Platform = process.platform,
  arch: string = process.arch,
): string[] {
  const fixed: string[] = []
  for (const candidate of spawnHelperCandidates(packageDir, platform, arch)) {
    let mode: number
    try {
      mode = statSync(candidate).mode
    } catch {
      continue
    }
    if ((mode & 0o111) === 0o111) continue
    try {
      chmodSync(candidate, mode | 0o111)
      fixed.push(candidate)
    } catch (error) {
      console.error(`Could not make ${candidate} executable:`, error)
    }
  }
  return fixed
}
