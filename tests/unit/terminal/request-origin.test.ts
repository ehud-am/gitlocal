import { describe, it, expect } from 'vitest'
import { isLoopbackHostHeader, isLoopbackOrigin, isTrustedTerminalRequest } from '../../../src/terminal/request-origin.js'

describe('terminal request origin checks', () => {
  it('accepts loopback Host headers with or without a port, and a missing one', () => {
    for (const host of ['127.0.0.1:5173', '127.0.0.1', 'localhost:80', 'LOCALHOST', '[::1]:8080', '[::1]', undefined]) {
      expect(isLoopbackHostHeader(host), String(host)).toBe(true)
    }
  })

  it('rejects any other Host, including look-alikes', () => {
    for (const host of ['evil.example', 'evil.example:5173', '127.0.0.1.evil.example', 'localhost.evil.example:80', '[::2]:80', '']) {
      expect(isLoopbackHostHeader(host), host).toBe(false)
    }
  })

  it('accepts a loopback or missing Origin, and rejects other, opaque, and malformed origins', () => {
    expect(isLoopbackOrigin(undefined)).toBe(true)
    expect(isLoopbackOrigin('http://127.0.0.1:5173')).toBe(true)
    expect(isLoopbackOrigin('http://localhost:5173')).toBe(true)
    expect(isLoopbackOrigin('http://[::1]:5173')).toBe(true)
    expect(isLoopbackOrigin('https://evil.example')).toBe(false)
    expect(isLoopbackOrigin('null')).toBe(false)
    expect(isLoopbackOrigin('not a url')).toBe(false)
  })

  it('requires both checks to pass', () => {
    expect(isTrustedTerminalRequest('127.0.0.1:1', 'http://127.0.0.1:1')).toBe(true)
    expect(isTrustedTerminalRequest('evil.example:1', 'http://127.0.0.1:1')).toBe(false)
    expect(isTrustedTerminalRequest('127.0.0.1:1', 'https://evil.example')).toBe(false)
  })
})
