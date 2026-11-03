import { describe, expect, it } from 'vitest'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
// @ts-expect-error plain ESM packaging script without type declarations
import { PIXEL_END, PIXEL_START, applyReadmePixel, fillReadmePixel, pixelMarkdown, settingsFromEnv } from '../../packaging/npm/readme-pixel.mjs'

const root = resolve(new URL('../..', import.meta.url).pathname)
const endpoint = 'https://prod.example.workers.dev/ignored/path'
const block = `${PIXEL_START}\n${PIXEL_END}`

describe('README view-counting pixel', () => {
  it('keeps an empty pixel block in both committed READMEs', () => {
    for (const file of ['README.md', 'packaging/npm/README.md']) {
      const text = readFileSync(resolve(root, file), 'utf-8')
      expect(text).toContain(block)
      expect(text).not.toContain('pixel.gif')
    }
  })

  it('builds the image from the endpoint origin, key and path', () => {
    expect(pixelMarkdown({ endpoint, websiteKey: ' key_1-A ', path: '/npm/readme' })).toBe(
      '![](https://prod.example.workers.dev/v1/pixel.gif?website=key_1-A&path=/npm/readme)',
    )
  })

  it('writes nothing for missing or unsafe settings', () => {
    const ok = { endpoint, websiteKey: 'key', path: '/readme' }
    expect(pixelMarkdown({ ...ok, endpoint: undefined })).toBe('')
    expect(pixelMarkdown({ ...ok, endpoint: 'http://insecure.example' })).toBe('')
    expect(pixelMarkdown({ ...ok, endpoint: 'not a url' })).toBe('')
    expect(pixelMarkdown({ ...ok, websiteKey: '' })).toBe('')
    expect(pixelMarkdown({ ...ok, websiteKey: 'a"b' })).toBe('')
    expect(pixelMarkdown({ ...ok, path: 'readme' })).toBe('')
    expect(pixelMarkdown({ ...ok, path: '/a?b' })).toBe('')
    expect(pixelMarkdown({ ...ok, path: undefined })).toBe('')
  })

  it('replaces only the block, and refills or empties it idempotently', () => {
    const text = `# Title\n\n${block}\n`
    const settings = { endpoint, websiteKey: 'key', path: '/readme' }
    const filled = applyReadmePixel(text, settings)
    expect(filled).toBe(`# Title\n\n${PIXEL_START}\n\n![](https://prod.example.workers.dev/v1/pixel.gif?website=key&path=/readme)\n\n${PIXEL_END}\n`)
    expect(applyReadmePixel(filled, settings)).toBe(filled)
    expect(applyReadmePixel(filled, { ...settings, websiteKey: '' })).toBe(text)
    expect(applyReadmePixel('# No markers\n', settings)).toBe('# No markers\n')
    expect(applyReadmePixel(`${PIXEL_END}\n${PIXEL_START}`, settings)).toBe(`${PIXEL_END}\n${PIXEL_START}`)
  })

  it('prefers a separate pixel website key over the site key', () => {
    expect(settingsFromEnv({ VIZOALICA_ENDPOINT: endpoint, VIZOALICA_WEBSITE_KEY: 'site' }, '/x').websiteKey).toBe('site')
    expect(
      settingsFromEnv({ VIZOALICA_ENDPOINT: endpoint, VIZOALICA_WEBSITE_KEY: 'site', VIZOALICA_PIXEL_WEBSITE_KEY: 'px' }, '/x').websiteKey,
    ).toBe('px')
  })

  it('fills a file in place and reports whether it changed', () => {
    const dir = mkdtempSync(join(tmpdir(), 'gitlocal-pixel-'))
    try {
      const file = join(dir, 'README.md')
      writeFileSync(file, `${block}\n`)
      const env = { VIZOALICA_ENDPOINT: endpoint, VIZOALICA_WEBSITE_KEY: 'key' }
      expect(fillReadmePixel(file, '/npm/readme', env)).toBe(true)
      expect(readFileSync(file, 'utf-8')).toContain('path=/npm/readme')
      expect(fillReadmePixel(file, '/npm/readme', env)).toBe(false)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('fills the pixel in the packed npm README only, with the npm path', () => {
    const script = readFileSync(resolve(root, 'packaging/npm/use-npm-readme.mjs'), 'utf-8')
    expect(script).toContain("fillReadmePixel(githubReadme, '/npm/readme')")
    const publish = readFileSync(resolve(root, '.github/workflows/publish.yml'), 'utf-8')
    expect(publish).toMatch(/npm publish --access public\n\s+env:\n(\s+#.*\n)*\s+VIZOALICA_ENDPOINT:/)
    const workflow = readFileSync(resolve(root, '.github/workflows/readme-pixel.yml'), 'utf-8')
    expect(workflow).toContain('node packaging/npm/readme-pixel.mjs README.md /github/readme')
  })
})
