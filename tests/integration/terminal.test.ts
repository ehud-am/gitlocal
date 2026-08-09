import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { serve } from '@hono/node-server'
import type { Server } from 'node:http'
import WebSocket from 'ws'
import { createApp } from '../../src/server.js'
import { attachTerminalWebSocketServer } from '../../src/terminal/websocket.js'
import type { TerminalSession } from '../../src/terminal/types.js'

// node-pty ships a native (prebuilt) binary and isn't loadable in every sandbox this suite
// runs in. Rather than skip on process.platform (which isPtySupported() already reports as
// supported for darwin/linux/win32 regardless of whether a prebuild actually resolves here),
// probe the real dynamic import once and skip this whole file only where it genuinely fails —
// so it still runs for real on any machine/CI with a working node-pty build.
let ptyLoadable = true
try {
  await import('node-pty')
} catch {
  ptyLoadable = false
}

function makeGitRepo(): { dir: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'gitlocal-terminal-int-'))
  spawnSync('git', ['init'], { cwd: dir })
  spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: dir })
  spawnSync('git', ['config', 'user.name', 'Test' ], { cwd: dir })
  return { dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) }
}

describe.skipIf(!ptyLoadable)('terminal integration (real shell)', () => {
  let dir: string
  let cleanupRepo: () => void
  let server: Server
  let baseUrl: string

  beforeAll(async () => {
    const repo = makeGitRepo()
    dir = repo.dir
    cleanupRepo = repo.cleanup

    const app = createApp(dir)
    await new Promise<void>((resolve) => {
      server = serve({ fetch: app.fetch, hostname: '127.0.0.1', port: 0 }, (info) => {
        baseUrl = `http://127.0.0.1:${info.port}`
        resolve()
      }) as Server
    })
    attachTerminalWebSocketServer(server)
  })

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()))
    cleanupRepo()
  })

  it('spawns a real shell, streams command output over the socket, and closes cleanly', async () => {
    const createRes = await fetch(`${baseUrl}/api/terminal/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'regular' }),
    })
    expect(createRes.status).toBe(201)
    const session = (await createRes.json()) as TerminalSession
    expect(session.status).toBe('running')

    const wsUrl = `${baseUrl.replace('http://', 'ws://')}/api/terminal/sessions/${session.id}/io`
    const ws = new WebSocket(wsUrl)
    await new Promise<void>((resolve, reject) => {
      ws.once('open', () => resolve())
      ws.once('error', reject)
    })

    const output = await new Promise<string>((resolve, reject) => {
      let buffered = ''
      const timeout = setTimeout(() => reject(new Error('timed out waiting for echoed output')), 10_000)
      ws.on('message', (raw) => {
        const frame = JSON.parse(raw.toString()) as { type: string; data?: string }
        if (frame.type === 'output' && frame.data) {
          buffered += frame.data
          if (buffered.includes('integration-test-marker')) {
            clearTimeout(timeout)
            resolve(buffered)
          }
        }
      })
      ws.send(JSON.stringify({ type: 'input', data: 'echo integration-test-marker\n' }))
    })
    expect(output).toContain('integration-test-marker')

    ws.close()
    await new Promise<void>((resolve) => ws.once('close', () => resolve()))

    const deleteRes = await fetch(`${baseUrl}/api/terminal/sessions/${session.id}`, { method: 'DELETE' })
    expect(deleteRes.status).toBe(204)

    const listRes = await fetch(`${baseUrl}/api/terminal/sessions`)
    const sessions = (await listRes.json()) as TerminalSession[]
    expect(sessions.find((s) => s.id === session.id)).toBeUndefined()
  })
})
