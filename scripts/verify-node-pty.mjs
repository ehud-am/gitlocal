#!/usr/bin/env node
// Runs as gitlocal's own postinstall. node-pty ships a prebuilt native binding
// per platform/arch, but its own install step only checks that a prebuild
// *directory* exists for the current platform — it never confirms the binary
// actually loads (e.g. it can be blocked by macOS Gatekeeper/codesigning).
// `npm rebuild node-pty` alone is a no-op in that case, since node-pty's
// install script short-circuits to the (broken) prebuild again. So: verify
// the binding actually spawns a shell, and if it doesn't, force a real
// from-source rebuild automatically.
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const require = createRequire(import.meta.url)
const packageRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

// node-pty 1.1.0 ships its prebuilt macOS spawn-helper without the execute bit, so every spawn
// fails with "posix_spawnp failed" (the server repeats this repair at runtime, see
// src/terminal/spawn-helper.ts). Fix the mode first so a working prebuild isn't rebuilt.
function ensureSpawnHelperExecutable() {
  if (process.platform === 'win32') return
  const ptyDir = path.dirname(require.resolve('node-pty/package.json'))
  for (const helper of [
    path.join(ptyDir, 'build', 'Release', 'spawn-helper'),
    path.join(ptyDir, 'prebuilds', `${process.platform}-${process.arch}`, 'spawn-helper'),
  ]) {
    try {
      const { mode } = fs.statSync(helper)
      if ((mode & 0o111) !== 0o111) fs.chmodSync(helper, mode | 0o111)
    } catch {
      // Missing helper (other platform or source build layout) or read-only install.
    }
  }
}

function verifyPtyLoads() {
  ensureSpawnHelperExecutable()
  delete require.cache[require.resolve('node-pty')]
  const pty = require('node-pty')
  const shell = process.platform === 'win32' ? 'cmd.exe' : process.env.SHELL || '/bin/sh'
  const session = pty.spawn(shell, [], { name: 'xterm-color', cols: 80, rows: 24, cwd: packageRoot })
  session.kill()
}

try {
  verifyPtyLoads()
} catch (err) {
  console.warn(`[gitlocal] node-pty's native binding failed to load (${err.message}).`)
  console.warn('[gitlocal] Rebuilding it from source...')

  const rebuild = spawnSync('npm', ['rebuild', 'node-pty', '--build-from-source'], {
    cwd: packageRoot,
    stdio: 'inherit',
    env: { ...process.env, npm_config_build_from_source: 'true' },
  })

  if (rebuild.status !== 0) {
    console.warn('[gitlocal] Automatic rebuild failed — the integrated terminal panel will not work.')
    console.warn('[gitlocal] Install a C++ toolchain (macOS: `xcode-select --install`) then run:')
    console.warn(`[gitlocal]   npm rebuild node-pty --build-from-source --prefix "${packageRoot}"`)
  } else {
    try {
      verifyPtyLoads()
      console.warn('[gitlocal] node-pty rebuilt successfully — the terminal panel should now work.')
    } catch (err2) {
      console.warn(`[gitlocal] node-pty still fails to load after rebuilding: ${err2.message}`)
    }
  }
}
