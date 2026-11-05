import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { shouldDeployArrivo } from '../scripts/arrivo-deploy-scope.mjs'

const publicRoot = resolve('public')
const config = JSON.parse(readFileSync(resolve(publicRoot, 'staticwebapp.config.json'), 'utf8'))
const pages = [
  ['/arrivo/', 'Arrivo - A little more arriving', 'A little less watching.'],
  ['/arrivo/privacy/', 'Arrivo Privacy policy', 'Privacy policy'],
  ['/arrivo/support/', 'Arrivo Support', 'Arrivo Support'],
]

describe('Arrivo static website', () => {
  it.each(pages)('publishes the complete public document at %s', (route, title, heading) => {
    const path = resolve(publicRoot, `.${route}index.html`)
    expect(existsSync(path), `${route} must be a real static document, not the Saha SPA`).toBe(true)
    const document = new DOMParser().parseFromString(readFileSync(path, 'utf8'), 'text/html')
    expect(document.title).toBe(title)
    expect(document.querySelector('h1')?.textContent).toContain(heading)
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      `https://www.wesaha.com${route}`,
    )
    expect(document.querySelector('main')).not.toBeNull()
    expect(document.querySelectorAll('script, iframe, form')).toHaveLength(0)
    expect(document.body.textContent).toContain('madhu@wesaha.com')
    for (const element of document.querySelectorAll('a[href], link[href], img[src]')) {
      const target = element.getAttribute('href') ?? element.getAttribute('src')
      if (!target || target.startsWith('#') || /^(https?:|mailto:)/.test(target)) continue
      const local = resolve(publicRoot, `.${route}`, target)
      expect(existsSync(target.endsWith('/') ? resolve(local, 'index.html') : local), target).toBe(
        true,
      )
    }
  })

  it.each(pages)('routes %s anonymously without replacing existing Saha routing', (route) => {
    expect(config.routes).toEqual(
      expect.arrayContaining([
        { route, rewrite: `${route}index.html`, allowedRoles: ['anonymous'] },
      ]),
    )
    expect(config.trailingSlash).toBe('auto')
    expect(config.navigationFallback.rewrite).toBe('/index.html')
    expect(config.responseOverrides['404']).toEqual({ rewrite: '/index.html', statusCode: 200 })
    expect(config.navigationFallback.exclude).toContain('/arrivo/*')
  })

  it('does not declare duplicate routes after Azure normalizes trailing slashes', () => {
    const routes = config.routes.map(({ route }) => route.replace(/\/$/, ''))
    expect(new Set(routes).size).toBe(routes.length)
  })
})

describe('website-only deployment scope', () => {
  it.each([
    ['frontend/public/arrivo/privacy/index.html'],
    ['frontend/public/staticwebapp.config.json'],
    ['frontend/playwright.config.ts'],
    ['.github/workflows/arrivo-site.yml'],
    [
      'frontend/public/arrivo/index.html',
      '.github/workflows/cd.yml',
      'docs/deployment/DEPLOYMENT_GUIDE.md',
    ],
  ])('publishes website-only changes %j', (...paths) => {
    expect(shouldDeployArrivo(paths)).toBe(true)
  })

  it.each([
    [],
    ['docs/deployment/DEPLOYMENT_GUIDE.md'],
    ['backend/src/Saha.API/Program.cs'],
    ['frontend/public/arrivo/index.html', 'backend/src/Saha.API/Program.cs'],
    ['frontend/public/arrivo/index.html', 'infrastructure/bicep/main.bicep'],
    ['frontend/public/arrivo/index.html', 'frontend/src/app/App.tsx'],
    ['frontend/public/arrivo/index.html', 'frontend/package-lock.json'],
  ])('leaves mixed/full-stack changes to the existing CD workflow %j', (...paths) => {
    expect(shouldDeployArrivo(paths)).toBe(false)
  })
})
