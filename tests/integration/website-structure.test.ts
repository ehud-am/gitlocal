import { describe, expect, it } from 'vitest'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'

const docsDir = resolve(new URL('../../docs', import.meta.url).pathname)
const ORIGIN = 'https://gitlocal.dev'
const ANALYTICS_LOADER = '<script async src="/vizoalica-loader.js"></script>'

function listHtmlFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      if (entry === 'assets') continue
      out.push(...listHtmlFiles(full))
    } else if (entry.endsWith('.html')) {
      out.push(full)
    }
  }
  return out.sort()
}

function routeFor(file: string): string {
  const rel = relative(docsDir, file).split(sep).join('/')
  if (rel === 'index.html') return '/'
  if (rel.endsWith('/index.html')) return `/${rel.slice(0, -'index.html'.length)}`
  return `/${rel}`
}

const files = listHtmlFiles(docsDir)
const pages = files.map((file) => ({ file, route: routeFor(file), html: readFileSync(file, 'utf-8') }))
const indexable = pages.filter((p) => p.route !== '/404.html')
const byRoute = new Map(pages.map((p) => [p.route, p]))

function attr(html: string, re: RegExp): string | undefined {
  return re.exec(html)?.[1]
}

function localLinks(html: string): string[] {
  const out: string[] = []
  for (const m of html.matchAll(/\s(?:href|src)="([^"]*)"/g)) {
    const value = m[1] ?? ''
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|\/)/i.test(value)) continue
    out.push(value)
  }
  return out
}

// Resolve a page-relative link to a route/file the way a static host would.
function resolveLink(fromFile: string, link: string): { target: string; hash: string } {
  const [pathPart = '', hash = ''] = link.split('#')
  const base = pathPart === '' ? fromFile : resolve(dirname(fromFile), pathPart)
  return { target: base, hash }
}

function resolvesToFile(target: string): string | null {
  if (existsSync(target) && statSync(target).isFile()) return target
  const index = join(target, 'index.html')
  return existsSync(index) ? index : null
}

describe('gitlocal.dev multi-page site', () => {
  it('has the expected set of pages, so a page is never dropped silently', () => {
    expect(pages.map((p) => p.route)).toEqual(
      expect.arrayContaining([
        '/',
        '/features/',
        '/install/',
        '/community/',
        '/faq/',
        '/404.html',
        '/features/browse/',
        '/features/search/',
        '/features/markdown/',
        '/features/previews/',
        '/features/review/',
        '/features/git-state/',
        '/features/edit/',
        '/features/terminal/',
      ]),
    )
  })

  it('loads the analytics loader on every page (including 404), so navigation between pages is measurable', () => {
    for (const p of pages) {
      expect(p.html, p.route).toContain(ANALYTICS_LOADER)
    }
  })

  it('gives every indexable page a unique title and description, exactly one h1, and a self-referencing canonical URL', () => {
    const titles = new Set<string>()
    const descriptions = new Set<string>()
    for (const p of indexable) {
      const title = attr(p.html, /<title>([^<]+)<\/title>/)
      const description = attr(p.html, /<meta name="description" content="([^"]+)"/)
      expect(title, `${p.route} title`).toBeTruthy()
      expect(description, `${p.route} description`).toBeTruthy()
      expect(titles.has(title!), `duplicate title on ${p.route}`).toBe(false)
      expect(descriptions.has(description!), `duplicate description on ${p.route}`).toBe(false)
      titles.add(title!)
      descriptions.add(description!)

      expect(p.html.match(/<h1[\s>]/g)?.length, `${p.route} h1 count`).toBe(1)
      expect(attr(p.html, /<link rel="canonical" href="([^"]+)"/), `${p.route} canonical`).toBe(`${ORIGIN}${p.route}`)
      expect(attr(p.html, /<meta property="og:url" content="([^"]+)"/), `${p.route} og:url`).toBe(`${ORIGIN}${p.route}`)
    }
  })

  it('serves a real, non-indexed 404 page (Cloudflare Pages otherwise falls back to index.html with a 200)', () => {
    const notFound = byRoute.get('/404.html')
    expect(notFound).toBeDefined()
    expect(notFound!.html).toContain('<meta name="robots" content="noindex, follow">')
    expect(notFound!.html).not.toContain('rel="canonical"')
  })

  it('lists every indexable page in sitemap.xml and nothing else', () => {
    const sitemap = readFileSync(join(docsDir, 'sitemap.xml'), 'utf-8')
    const listed = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
    expect([...listed].sort()).toEqual(indexable.map((p) => `${ORIGIN}${p.route}`).sort())
  })

  it('keeps every relative link and asset resolving to a real file, and every #fragment to a real id', () => {
    for (const p of indexable) {
      for (const link of localLinks(p.html)) {
        const { target, hash } = resolveLink(p.file, link)
        const resolved = resolvesToFile(target)
        expect(resolved, `${p.route} -> ${link}`).not.toBeNull()
        if (hash && resolved!.endsWith('.html')) {
          const destination = readFileSync(resolved!, 'utf-8')
          expect(destination, `${p.route} -> ${link} (missing id)`).toMatch(new RegExp(`\\sid="${hash}"`))
        }
      }
    }
  })

  it('shows the same main navigation destinations on every page', () => {
    const expected = ['features/', 'install/', 'community/', 'faq/']
    for (const p of pages) {
      const nav = /<nav class="nav-links"[^>]*>([\s\S]*?)<\/nav>/.exec(p.html)?.[1] ?? ''
      const hrefs = [...nav.matchAll(/href="([^"]+)"/g)].map((m) => m[1]!)
      const internal = hrefs.filter((h) => !h.startsWith('https://github.com'))
      expect(internal.map((h) => h.replace(/^https:\/\/gitlocal\.dev\//, '').replace(/^(?:\.\.\/)+/, '')), p.route).toEqual(expected)
      expect(hrefs.some((h) => h === 'https://github.com/ehud-am/gitlocal'), `${p.route} GitHub link`).toBe(true)
    }
  })

  it('reaches every feature topic from the features hub, and every topic links onward', () => {
    const hub = byRoute.get('/features/')!
    const topics = indexable.filter((p) => /^\/features\/[^/]+\/$/.test(p.route))
    expect(topics.length).toBe(8)
    for (const t of topics) {
      expect(hub.html, `hub -> ${t.route}`).toContain(`href="..${t.route}"`)
      expect(t.html, `${t.route} pager`).toContain('class="pager"')
      expect(t.html, `${t.route} breadcrumb`).toContain('class="breadcrumb"')
    }
  })

  it('keeps structured data valid, with the FAQPage only on the page that shows the FAQ', () => {
    for (const p of pages) {
      for (const m of p.html.matchAll(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/g)) {
        expect(() => JSON.parse(m[1]!), `${p.route} JSON-LD`).not.toThrow()
      }
    }
    const faqPages = indexable.filter((p) => p.html.includes('"@type": "FAQPage"'))
    expect(faqPages.map((p) => p.route)).toEqual(['/faq/'])

    const faq = byRoute.get('/faq/')!
    const ld = JSON.parse(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/.exec(faq.html)![1]!)
    const questions = (ld['@graph'] as Array<{ '@type': string; mainEntity?: unknown[] }>).find((n) => n['@type'] === 'FAQPage')!
    expect(questions.mainEntity!.length).toBe(faq.html.match(/class="faq-item"/g)?.length)
  })

  it('keeps old home-page anchors working: #features, #install, #community stay on home; #faq redirects', () => {
    const home = byRoute.get('/')!
    for (const id of ['features', 'install', 'community']) {
      expect(home.html).toMatch(new RegExp(`id="${id}"`))
    }
    expect(home.html).toContain('data-page="home"')
    expect(readFileSync(join(docsDir, 'script.js'), 'utf-8')).toContain('location.hash === "#faq"')
  })
})
