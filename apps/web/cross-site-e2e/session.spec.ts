import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { createServer } from 'node:https'
import type { Server } from 'node:https'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const web = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const frontend = 'https://elibrary-ai.wasmer.app'
const backend = 'https://backend-shiodr.wasmer.app'
let temporary: string
let server: Server | undefined
let emulateLegacyCookie = false

test.beforeAll(async () => {
  test.setTimeout(60_000)
  temporary = await mkdtemp(resolve(tmpdir(), 'elibrary-cross-site-'))
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes',
    '-keyout', resolve(temporary, 'key.pem'), '-out', resolve(temporary, 'cert.pem'),
    '-days', '1', '-subj', '/CN=elibrary-local-cookie-test',
    '-addext', 'subjectAltName=DNS:elibrary-ai.wasmer.app,DNS:backend-shiodr.wasmer.app'], { stdio: 'ignore', timeout: 15_000 })
  const assets = resolve(web, 'dist')
  const mime: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' }
  server = createServer({ key: await readFile(resolve(temporary, 'key.pem')), cert: await readFile(resolve(temporary, 'cert.pem')) }, async (req, res) => {
    try {
      const url = new URL(req.url!, `https://${req.headers.host}`)
      if (url.hostname === 'backend-shiodr.wasmer.app' && url.pathname.startsWith('/api/v1/')) {
        const chunks: Buffer[] = []
        for await (const chunk of req) chunks.push(Buffer.from(chunk))
        const body = Buffer.concat(chunks)
        const headers: Record<string, string> = {}
        for (const name of ['origin', 'cookie', 'content-type', 'authorization', 'access-control-request-method', 'access-control-request-headers']) {
          if (typeof req.headers[name] === 'string') headers[name] = req.headers[name]
        }
        // This proxy has a fixed loopback target. Browser cookies are forwarded only if Chrome sends them.
        const upstream = await fetch(`http://127.0.0.1:8001${url.pathname}${url.search}`, {
          method: req.method, headers, ...(body.length ? { body } : {}), redirect: 'manual',
        })
        const output = Buffer.from(await upstream.arrayBuffer())
        for (const [name, value] of upstream.headers) {
          if (!['set-cookie', 'content-length', 'transfer-encoding', 'content-encoding', 'connection'].includes(name)) res.setHeader(name, value)
        }
        const cookies = upstream.headers.getSetCookie().map(header => emulateLegacyCookie ? header.replace(/; Partitioned\b/gi, '') : header)
        if (cookies.length) res.setHeader('Set-Cookie', cookies)
        res.writeHead(upstream.status)
        res.end(output)
      } else if (url.hostname === 'elibrary-ai.wasmer.app') {
        const file = resolve(assets, `.${url.pathname}`)
        if (file !== assets && !file.startsWith(assets + sep)) { res.writeHead(404); res.end(); return }
        const selected = extname(file) ? file : resolve(assets, 'index.html')
        res.setHeader('Content-Type', mime[extname(selected)] || 'application/octet-stream')
        res.end(await readFile(selected))
      } else { res.writeHead(404); res.end() }
    } catch { res.writeHead(502); res.end('Local test proxy failed.') }
  })
  await new Promise<void>((done, reject) => { server!.once('error', reject); server!.listen(8443, '127.0.0.1', done) })
})

test.afterAll(async () => {
  if (server) await new Promise<void>(done => server!.close(() => done()))
  if (temporary) await rm(temporary, { recursive: true, force: true })
})

test.beforeEach(async ({ page, context }) => {
  emulateLegacyCookie = false
  await page.goto(frontend)
  const cdp = await context.newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.setCookieControls', { enableThirdPartyCookieRestriction: true })
  await page.reload()
})

async function openPrivateSections(page: Page) {
  const nav = page.getByRole('navigation', { name: 'Main navigation' })
  await nav.getByRole('link', { name: 'My Library', exact: true }).click()
  await expect(page.getByRole('heading', { name: /My Library/ })).toBeVisible()
  await expect(page.getByText('Download tracking demonstration', { exact: true })).toBeVisible()
  await nav.getByRole('link', { name: 'AI Assistant', exact: true }).click()
  await expect(page.getByLabel('Ask the library', { exact: true })).toBeEnabled()
  await page.reload()
  await expect(page.getByLabel('Ask the library', { exact: true })).toBeEnabled()
  expect(await page.evaluate(async api => (await fetch(`${api}/auth/me`, { credentials: 'include' })).status, `${backend}/api/v1`)).toBe(200)
}

test('legacy unpartitioned cookie reproduces the reported web-only session loss', async ({ page, context }) => {
  emulateLegacyCookie = true
  await page.getByRole('button', { name: 'Continue as Guest', exact: true }).click()
  await expect(page.getByText('Guest reader', { exact: true })).toBeVisible()
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'My Library', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Your guest session ended.' })).toBeVisible()
  expect((await context.cookies()).some(cookie => cookie.name === 'elibrary_session')).toBe(false)
})

test('partitioned guest cookie survives My Library, Assistant, refresh, and logout with third-party cookies blocked', async ({ page, context }) => {
  await page.getByRole('button', { name: 'Continue as Guest', exact: true }).click()
  await expect(page.getByText('Guest reader', { exact: true })).toBeVisible()
  await openPrivateSections(page)
  await page.getByLabel('Ask the library', { exact: true }).fill('Find beginner-friendly Rust books.')
  await page.getByRole('button', { name: 'Send question', exact: true }).click()
  await expect(page.locator('.library-chat-books .book-card').first()).toBeVisible()
  const cookie = (await context.cookies()).find(cookie => cookie.name === 'elibrary_session')!
  expect(cookie.httpOnly && cookie.secure).toBe(true)
  expect(cookie.partitionKey).toBe('https://elibrary-ai.wasmer.app')
  expect(await page.evaluate(() => document.cookie.includes('elibrary_session'))).toBe(false)
  await page.getByRole('button', { name: 'End guest session', exact: true }).click()
  await expect(page).toHaveURL(frontend + '/')
  expect((await context.cookies()).some(cookie => cookie.name === 'elibrary_session')).toBe(false)
})

test('registered web cookie survives registration, login, private navigation, and refresh under cookie blocking', async ({ page }) => {
  const email = `cookie-${randomBytes(8).toString('hex')}@example.com`
  const password = randomBytes(24).toString('base64url')
  await page.goto('/register')
  await page.getByLabel('Full name').fill('Cookie Test Reader')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByLabel('Confirm password').fill(password)
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  await expect(page.getByRole('heading', { name: /Hello, Cookie/ })).toBeVisible()
  await openPrivateSections(page)
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await page.goto('/login')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Log in', exact: true }).click()
  await expect(page.getByRole('heading', { name: /Hello, Cookie/ })).toBeVisible()
  await openPrivateSections(page)
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await page.goto('/app/library')
  await expect(page.getByRole('form', { name: 'Login', exact: true })).toBeVisible()
})
