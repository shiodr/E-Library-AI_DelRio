import { expect as baseExpect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const expect = baseExpect.configure({ timeout: 60_000 })
const api = 'http://127.0.0.1:8000/api/v1'
const origin = 'http://127.0.0.1:5173'
const headers = { Origin: origin }
const backend = resolve(dirname(fileURLToPath(import.meta.url)), '../../../backend')
const python = resolve(backend, process.platform === 'win32' ? '.venv/Scripts/python.exe' : '.venv/bin/python')

interface BookRecord { id: string; title: string; author: string; category: string; access_type: string; is_active: boolean }
interface ChatResult { conversation_id: string; answer: string; books: BookRecord[]; mode: string; generation_available: boolean }
interface Overview { total_books: number; active_books: number; archived_books: number; registered_users: number; total_downloads: number }

test.setTimeout(180_000)
test.use({ actionTimeout: 60_000 })

async function startGuest(page: Page) {
  const response = await page.request.post(`${api}/auth/guest`, { data: { client: 'web' }, headers })
  expect(response.status()).toBe(201)
}

async function registerReader(page: Page, label: string) {
  const suffix = `${Date.now()}-${randomBytes(5).toString('hex')}`
  const email = `phase1-${label}-${suffix}@example.com`
  const response = await page.request.post(`${api}/auth/register`, {
    data: { full_name: `Phase1 QA ${label}`, email, password: randomBytes(24).toString('base64url'), client: 'web' },
    headers,
  })
  expect(response.status()).toBe(201)
  expect((await response.json()).user.role).toBe('reader')
  return { email, suffix }
}

async function ensureRetrievalOnly(page: Page) {
  const response = await page.request.get(`${api}/assistant/status`)
  expect(response.status()).toBe(200)
  // Fail before any chat POST if an already-running server would make paid provider calls.
  expect((await response.json()).generation_available).toBe(false)
}

async function freeRustBook(page: Page): Promise<BookRecord> {
  const response = await page.request.get(`${api}/books`, { params: { q: 'The Rust Programming Language' } })
  expect(response.status()).toBe(200)
  const book = (await response.json()).items.find((item: BookRecord) => item.title === 'The Rust Programming Language')
  expect(book).toBeDefined()
  expect(book.access_type).toBe('free_to_read')
  return book
}

async function ask(page: Page, message: string): Promise<ChatResult> {
  await page.getByLabel('Ask the library', { exact: true }).fill(message)
  const response = page.waitForResponse(value => value.url() === `${api}/assistant/chat` && value.request().method() === 'POST')
  await page.getByRole('button', { name: 'Send question', exact: true }).click()
  const completed = await response
  expect(completed.status()).toBe(200)
  return completed.json()
}

async function overview(page: Page): Promise<Overview> {
  const response = await page.request.get(`${api}/admin/overview`)
  expect(response.status()).toBe(200)
  return response.json()
}

async function metric(page: Page, label: string, value: number) {
  const card = page.locator('.admin-metric').filter({ has: page.getByText(label, { exact: true }) })
  await expect.poll(async () => Number((await card.locator('strong').innerText()).replace(/[^0-9]/g, ''))).toBe(value)
}

async function searchManagedBooks(page: Page, query: string) {
  await page.getByRole('textbox', { name: 'Search managed books', exact: true }).fill(query)
  await page.getByRole('button', { name: 'Search books', exact: true }).click()
}

function provision(email: string, action: '--grant' | '--revoke') {
  // This trusted local CLI is the only role-provisioning mechanism; no password enters command arguments.
  execFileSync(python, ['-m', 'app.services.admin_access', '--email', email, action], {
    cwd: backend, timeout: 30_000, stdio: 'pipe', env: { ...process.env, OPENAI_API_KEY: '' },
  })
}

test('assistant retrieves real Rust/Python records, retains follow-ups, and recovers after one network failure', async ({ page }) => {
  await startGuest(page)
  await ensureRetrievalOnly(page)
  await page.goto('/app/assistant')
  await expect(page.getByRole('heading', { name: /Your library assistant/ })).toBeVisible()
  await expect(page.locator('.library-chat-disclosure')).toContainText('AI generation is not configured.')

  let failOnce = true
  await page.route(`${api}/assistant/chat`, async route => {
    if (failOnce) { failOnce = false; await route.abort('failed') }
    else await route.continue()
  })
  await page.getByRole('button', { name: 'Find beginner-friendly Rust books.', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Cannot reach the library.')
  const retryResponse = page.waitForResponse(value => value.url() === `${api}/assistant/chat` && value.request().method() === 'POST')
  await page.getByRole('button', { name: 'Retry question', exact: true }).click()
  const retried = await retryResponse
  expect(retried.status()).toBe(200)
  const rust: ChatResult = await retried.json()
  await page.unroute(`${api}/assistant/chat`)
  expect(rust.mode).toBe('catalog_only')
  expect(rust.books.length).toBeGreaterThan(0)
  expect(rust.books.every(book => book.category === 'Rust')).toBe(true)
  await expect(page.getByRole('article', { name: 'Your message', exact: true })).toHaveCount(1)
  await expect(page.getByRole('article', { name: 'Assistant message', exact: true })).toHaveCount(1)

  const followup = await ask(page, 'Only free ones')
  expect(followup.conversation_id).toBe(rust.conversation_id)
  expect(followup.books.length).toBeGreaterThan(0)
  expect(followup.books.every(book => book.category === 'Rust' && book.access_type === 'free_to_read')).toBe(true)
  const recommendation = page.getByRole('article', { name: 'Assistant message', exact: true }).last().locator('.book-card').first()
  await expect(recommendation).toHaveAttribute('href', `/app/books/${followup.books[0].id}`)
  await recommendation.click()
  await expect(page.getByRole('heading', { name: followup.books[0].title, exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Read at the authorized source' })).toHaveAttribute('href', /^https:/)

  await page.goBack()
  await expect(page).toHaveURL('/app/assistant')
  const pythonBooks = await ask(page, 'Recommend beginner-friendly Python books.')
  expect(pythonBooks.mode).toBe('catalog_only')
  expect(pythonBooks.books.length).toBeGreaterThan(0)
  expect(pythonBooks.books.every(book => book.category === 'Python')).toBe(true)
  const pythonCard = page.getByRole('article', { name: 'Assistant message', exact: true }).last().locator('.book-card').first()
  await expect(pythonCard).toHaveAttribute('href', `/app/books/${pythonBooks.books[0].id}`)
  await pythonCard.click()
  await expect(page.getByRole('heading', { name: pythonBooks.books[0].title, exact: true })).toBeVisible()
})

test('tracking demonstration is idempotent and visible in private history, with working favorites', async ({ page }) => {
  await registerReader(page, 'tracking')
  const book = await freeRustBook(page)
  await page.goto(`/app/books/${book.id}`)
  await expect(page.getByRole('heading', { name: book.title, exact: true })).toBeVisible()
  await expect(page.getByText('In-app book-file delivery is not implemented.', { exact: false })).toBeVisible()

  let response = page.waitForResponse(value => value.url() === `${api}/downloads` && value.request().method() === 'POST')
  await page.getByRole('button', { name: 'Record tracking demonstration', exact: true }).click()
  let recorded = await response
  expect(recorded.status()).toBe(201)
  expect((await recorded.json()).allowance.used).toBe(1)
  await expect(page.locator('.success-notice')).toContainText('1 of 10 tracked. No file was downloaded.')

  response = page.waitForResponse(value => value.url() === `${api}/downloads` && value.request().method() === 'POST')
  await page.getByRole('button', { name: 'Record tracking demonstration', exact: true }).click()
  recorded = await response
  expect(recorded.status()).toBe(200)
  const repeated = await recorded.json()
  expect(repeated.already_downloaded).toBe(true)
  expect(repeated.allowance.used).toBe(1)
  await expect(page.locator('.success-notice')).toContainText('Already recorded; allowance unchanged.')
  await page.getByRole('link', { name: 'View My Library', exact: true }).click()
  await expect(page.getByRole('heading', { name: /My Library/ })).toBeVisible()
  await expect(page.locator('.library-disclosure')).toContainText('No book file is downloaded or delivered.')
  await expect(page.locator('.library-disclosure')).toContainText('1 of 10 tracked')
  await expect(page.getByRole('heading', { name: book.title, exact: true })).toBeVisible()
  await page.reload()
  await expect(page.locator('.library-disclosure')).toContainText('1 of 10 tracked')

  await page.goto(`/app/books/${book.id}`)
  await page.getByRole('button', { name: 'Save to favorites', exact: true }).click()
  await expect(page.locator('.success-notice')).toContainText('Saved to your favorites.')
  await page.getByRole('link', { name: 'View favorites', exact: true }).click()
  await expect(page.getByRole('heading', { name: book.title, exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: book.title, exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Remove favorite', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'No favorites yet.', exact: true })).toBeVisible()
  const history = await page.request.get(`${api}/downloads`)
  expect((await history.json()).total).toBe(1)
})

test('trusted admin provisioning enables real book management while guest and reader access stay denied', async ({ page }) => {
  await startGuest(page)
  await page.goto('/app/admin')
  await expect(page.getByRole('heading', { name: 'Administrator access required.', exact: true })).toBeVisible()
  expect((await page.request.get(`${api}/admin/overview`)).status()).toBe(403)
  const { email, suffix } = await registerReader(page, 'admin')
  await ensureRetrievalOnly(page)
  await page.goto('/app/admin')
  await expect(page.getByRole('heading', { name: 'Administrator access required.', exact: true })).toBeVisible()
  expect((await page.request.get(`${api}/admin/books`)).status()).toBe(403)
  await page.goto('/app')
  await expect(page.getByRole('link', { name: 'Administration', exact: true })).toHaveCount(0)

  let granted = false
  let bookId: string | undefined
  let originalActive: number | undefined
  try {
    provision(email, '--grant')
    granted = true
    await page.reload()
    await page.getByRole('link', { name: 'Administration', exact: true }).click()
    await expect(page.getByRole('heading', { name: /Administrator dashboard/ })).toBeVisible()
    const initial = await overview(page)
    const realBook = await freeRustBook(page)
    const tracking = await page.request.post(`${api}/downloads`, { data: { book_id: realBook.id }, headers })
    expect(tracking.status()).toBe(201)
    await page.getByRole('button', { name: 'Refresh data', exact: true }).click()
    const baseline = await overview(page)
    originalActive = baseline.active_books
    expect(baseline.total_downloads).toBe(initial.total_downloads + 1)
    await metric(page, 'Recorded downloads', baseline.total_downloads)
    await metric(page, 'Registered users', baseline.registered_users)
    await expect(page.locator('.admin-tracking-disclosure')).toContainText('They do not represent delivered book files.')
    await expect(page.getByRole('region', { name: 'Recent download tracking', exact: true })).toContainText(realBook.title)

    const title = `Phase1 QA metadata ${suffix}`
    const editedTitle = `${title} Revised`
    await page.getByRole('button', { name: 'Add book', exact: true }).click()
    const editor = page.locator('.admin-book-editor')
    await editor.getByLabel('Title', { exact: true }).fill(title)
    await editor.getByLabel('Author', { exact: true }).fill('Phase1 Automated QA')
    await editor.getByLabel('Category', { exact: true }).fill('Phase1 QA')
    await editor.getByLabel('Description', { exact: true }).fill('Clearly labeled automated QA metadata record. No book file or reading content is supplied.')
    await editor.getByLabel('Access type', { exact: true }).selectOption('paid')
    await editor.getByLabel('Authorized source URL', { exact: true }).fill(`https://example.com/phase1-qa/${suffix}`)
    await editor.getByLabel('License and access terms', { exact: true }).fill('QA metadata only. No book file or actual publisher access is provided.')
    let mutation = page.waitForResponse(value => value.url() === `${api}/admin/books` && value.request().method() === 'POST')
    await editor.getByRole('button', { name: 'Create book', exact: true }).click()
    let changed = await mutation
    expect(changed.status()).toBe(201)
    const created: BookRecord = await changed.json()
    bookId = created.id
    expect(created.title).toBe(title)
    expect(created.is_active).toBe(true)
    await expect(page.locator('.admin-success')).toContainText(`Added “${title}”.`)
    await metric(page, 'Total books', baseline.total_books + 1)
    await metric(page, 'Active books', baseline.active_books + 1)
    expect((await page.request.get(`${api}/books/${bookId}`)).status()).toBe(200)

    await page.reload()
    await searchManagedBooks(page, suffix)
    await page.getByLabel('Category', { exact: true }).selectOption('Phase1 QA')
    let row = page.getByRole('row').filter({ has: page.getByText(title, { exact: true }) })
    await expect(row).toBeVisible()
    await row.getByRole('button', { name: `Edit ${title}`, exact: true }).click()
    await editor.getByLabel('Title', { exact: true }).fill(editedTitle)
    mutation = page.waitForResponse(value => value.url() === `${api}/admin/books/${bookId}` && value.request().method() === 'PUT')
    await editor.getByRole('button', { name: 'Save changes', exact: true }).click()
    changed = await mutation
    expect(changed.status()).toBe(200)
    expect((await changed.json()).id).toBe(bookId)
    await expect(page.locator('.admin-success')).toContainText(`Updated “${editedTitle}”.`)
    expect((await (await page.request.get(`${api}/books/${bookId}`)).json()).title).toBe(editedTitle)

    row = page.getByRole('row').filter({ has: page.getByText(editedTitle, { exact: true }) })
    await row.getByRole('button', { name: `Archive ${editedTitle}`, exact: true }).click()
    let confirmation = page.getByRole('dialog', { name: 'Archive this book?', exact: true })
    await expect(confirmation).toContainText('Existing download history will be preserved.')
    mutation = page.waitForResponse(value => value.url() === `${api}/admin/books/${bookId}/archive` && value.request().method() === 'POST')
    await confirmation.getByRole('button', { name: 'Archive book', exact: true }).click()
    expect((await mutation).status()).toBe(200)
    await expect(page.locator('.admin-success')).toContainText(`Archived “${editedTitle}”.`)
    await metric(page, 'Active books', baseline.active_books)
    await metric(page, 'Archived books', baseline.archived_books + 1)
    expect((await page.request.get(`${api}/books/${bookId}`)).status()).toBe(404)
    const archivedSearch = await page.request.post(`${api}/assistant/chat`, { data: { message: `Find "${editedTitle}"` }, headers })
    expect(archivedSearch.status()).toBe(200)
    expect((await archivedSearch.json()).books).toHaveLength(0)

    await page.getByLabel('Book status', { exact: true }).selectOption('archived')
    await row.getByRole('button', { name: `Restore ${editedTitle}`, exact: true }).click()
    confirmation = page.getByRole('dialog', { name: 'Restore this book?', exact: true })
    mutation = page.waitForResponse(value => value.url() === `${api}/admin/books/${bookId}/restore` && value.request().method() === 'POST')
    await confirmation.getByRole('button', { name: 'Restore book', exact: true }).click()
    expect((await mutation).status()).toBe(200)
    await expect(page.locator('.admin-success')).toContainText(`Restored “${editedTitle}”.`)
    await metric(page, 'Active books', baseline.active_books + 1)
    await metric(page, 'Archived books', baseline.archived_books)
    expect((await page.request.get(`${api}/books/${bookId}`)).status()).toBe(200)
    const restoredSearch = await page.request.post(`${api}/assistant/chat`, { data: { message: `Find "${editedTitle}"` }, headers })
    expect(restoredSearch.status()).toBe(200)
    expect((await restoredSearch.json()).books.map((item: BookRecord) => item.id)).toEqual([bookId])
    expect((await overview(page)).total_downloads).toBe(baseline.total_downloads)
  } finally {
    try {
      if (bookId) {
        const archived = await page.request.post(`${api}/admin/books/${bookId}/archive`, { headers })
        expect(archived.status()).toBe(200)
        expect((await archived.json()).is_active).toBe(false)
        const catalog = await page.request.get(`${api}/books`)
        expect((await catalog.json()).total).toBe(originalActive)
      }
    } finally {
      if (granted) provision(email, '--revoke')
    }
  }
})
