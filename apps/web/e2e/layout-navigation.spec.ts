import { expect, test } from '@playwright/test'
import type { Page, TestInfo } from '@playwright/test'

const api = 'http://127.0.0.1:8000/api/v1'

function navigation(page: Page, info: TestInfo) {
  return page.getByRole('navigation', { name: info.project.name === 'mobile' ? 'Mobile navigation' : 'Main navigation' })
}

test('guest routes survive feature denials and recover a genuinely ended session in place', async ({ page }, info) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Continue as Guest', exact: true }).click()
  const nav = navigation(page, info)
  await nav.getByRole('link', { name: /explore/i }).click()
  await expect(page.locator('.book-card')).toHaveCount(12)
  await page.locator('.book-card').first().click()
  await expect(page.locator('.book-detail')).toBeVisible()
  await nav.getByRole('link', { name: /favorites/i }).click()
  await expect(page.getByRole('heading', { name: 'Create an account to save favorites.' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toBeVisible()

  await page.route(`${api}/downloads?*`, route => route.fulfill({ status: 401, json: { detail: 'Feature request denied for this test.' } }))
  await nav.getByRole('link', { name: 'My Library', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Feature request denied')
  await expect(page).toHaveURL('/app/library')
  expect((await page.request.get(`${api}/auth/me`)).status()).toBe(200)
  await page.unroute(`${api}/downloads?*`)

  await page.route(`${api}/assistant/status`, route => route.fulfill({ status: 403, json: { detail: 'Assistant access restricted for this test.' } }))
  await nav.getByRole('link', { name: /assistant/i }).click()
  await expect(page.getByText('This session cannot use the assistant.', { exact: false })).toBeVisible()
  await expect(page.getByLabel('Ask the library', { exact: true })).toBeDisabled()
  await expect(page).toHaveURL('/app/assistant')
  await page.unroute(`${api}/assistant/status`)
  await nav.getByRole('link', { name: /explore/i }).click()
  await expect(page.locator('.book-card')).toHaveCount(12)
  await page.reload()
  await expect(page.locator('.book-card')).toHaveCount(12)

  // Revoke only this test's local guest cookie to exercise a real authentication failure.
  expect((await page.request.post(`${api}/auth/logout`, { headers: { Origin: 'http://127.0.0.1:5173' } })).status()).toBe(204)
  await nav.getByRole('link', { name: 'My Library', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Your guest session ended.' })).toBeVisible()
  await expect(page).toHaveURL('/app/library')
  await page.getByRole('button', { name: 'Continue as Guest', exact: true }).click()
  await expect(page.getByRole('heading', { name: /My Library/ })).toBeVisible()
})

test('registered navigation retains its cookie through Back and reload, then clears on logout', async ({ page }, info) => {
  await page.goto('/register')
  await page.getByLabel('Full name').fill('Layout Test Reader')
  await page.getByLabel('Email address').fill(`layout-${info.project.name}-${Date.now()}@example.com`)
  await page.getByLabel('Password', { exact: true }).fill('local-layout-test-passphrase')
  await page.getByLabel('Confirm password').fill('local-layout-test-passphrase')
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  await expect(page.getByRole('heading', { name: /Hello, Layout/ })).toBeVisible()
  const nav = navigation(page, info)
  for (const label of ['Favorites', 'My Library', 'Assistant']) {
    await nav.getByRole('link', { name: new RegExp(label, 'i') }).click()
    await expect(page).not.toHaveURL('/login')
  }
  await page.reload()
  await expect(page.getByLabel('Ask the library', { exact: true })).toBeEnabled()
  await nav.getByRole('link', { name: /explore/i }).click()
  await page.goBack()
  await expect(page.getByLabel('Ask the library', { exact: true })).toBeEnabled()
  expect((await page.request.get(`${api}/auth/me`)).status()).toBe(200)
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page).toHaveURL('/')
  await page.goto('/app/favorites')
  await expect(page.getByRole('form', { name: 'Login', exact: true })).toBeVisible()
})

test('auth, details, and guest pages fit all required viewports in both themes', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'Viewport matrix runs once, independently of device presets.')
  test.setTimeout(180_000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.request.post(`${api}/auth/guest`, { data: { client: 'web' }, headers: { Origin: 'http://127.0.0.1:5173' } })
  const catalog = await (await page.request.get(`${api}/books?limit=1`)).json()
  await page.goto('/')
  const paths = ['/login', '/register', `/app/books/${catalog.items[0].id}`, '/app/explore', '/app/favorites', '/app/library', '/app/assistant']
  for (const width of [1440, 1024, 768, 390, 360]) {
    await page.setViewportSize({ width, height: 1000 })
    for (const theme of ['light', 'dark']) {
      await page.evaluate(value => localStorage.setItem('elibrary-theme', value), theme)
      for (const path of paths) {
        await page.goto(path)
        await expect(page.locator(path === '/login' || path === '/register' ? '.auth-form-panel h2' : '.page-content h1')).toBeVisible()
        await expect(page.locator('.loading-page')).toHaveCount(0)
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
        if (path.includes('/books/')) await expect(page.locator('.related-books .skeleton')).toHaveCount(0)
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px ${theme} ${path}`).toBe(true)
        if (width === 1440 && path === '/app/favorites') {
          await page.getByRole('button', { name: 'Collapse sidebar' }).click()
          const nav = page.getByRole('navigation', { name: 'Main navigation' })
          await expect(nav.getByRole('link', { name: 'My Library', exact: true })).toBeVisible()
          expect(await page.locator('.sidebar').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
          await page.getByRole('button', { name: 'Expand sidebar' }).click()
        }
        if (path === '/login' || path === '/register') {
          const contained = await page.locator('.auth-form-panel').evaluate(panel => {
            const outer = panel.getBoundingClientRect()
            return [...panel.querySelectorAll('input, button, h2')].every(child => {
              const box = child.getBoundingClientRect()
              return box.left >= outer.left + 12 && box.right <= outer.right - 12
            })
          })
          expect(contained, `Auth content inset at ${width}px`).toBe(true)
        }
        if (['/login', `/app/books/${catalog.items[0].id}`, '/app/assistant'].includes(path)) {
          await page.screenshot({ path: info.outputPath(`${width}-${theme}-${path === '/login' ? 'login' : path.includes('/books/') ? 'details' : 'assistant'}.png`), fullPage: true, animations: 'disabled' })
        }
      }
    }
  }
})
