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

const require = createRequire(import.meta.url)
const packageRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

function verifyPtyLoads() {
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
