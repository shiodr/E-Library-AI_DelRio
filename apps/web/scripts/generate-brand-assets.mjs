import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

// Raster outputs derive from the same vector mark used by the web favicon.
const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = await readFile(resolve(webRoot, 'public/icon.svg'), 'utf8')
const mark = source.match(/<g id="book-ai-mark"[\s\S]*<\/g>/)?.[0]
if (!mark) throw new Error('The canonical icon must contain the book-ai-mark group.')

function iconSvg(kind = 'standard') {
  const background = kind === 'foreground' ? '' : kind === 'round'
    ? '<circle cx="64" cy="64" r="64" fill="#4f46e5"/>'
    : `<rect width="128" height="128" rx="${kind === 'standard' ? 30 : 0}" fill="#4f46e5"/>`
  const scale = kind === 'foreground' ? .68 : kind === 'maskable' ? .72 : 1
  const inset = (128 - 128 * scale) / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">${background}<g transform="translate(${inset} ${inset}) scale(${scale})">${mark}</g></svg>`
}

const outputs = [
  ['public/icon-192.png', 192, 'standard'],
  ['public/icon-512.png', 512, 'standard'],
  ['public/maskable-icon-512.png', 512, 'maskable'],
  ['public/apple-touch-icon.png', 180, 'square'],
]
for (const [density, factor] of [['mdpi', 1], ['hdpi', 1.5], ['xhdpi', 2], ['xxhdpi', 3], ['xxxhdpi', 4]]) {
  const folder = `android/app/src/main/res/mipmap-${density}`
  outputs.push([`${folder}/ic_launcher.png`, 48 * factor, 'standard'])
  outputs.push([`${folder}/ic_launcher_round.png`, 48 * factor, 'round'])
  outputs.push([`${folder}/ic_launcher_foreground.png`, 108 * factor, 'foreground'])
}

const installedChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const executablePath = process.env.BRAND_CHROME_PATH || (existsSync(installedChrome) ? installedChrome : undefined)
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) })
try {
  const page = await browser.newPage()
  for (const [path, size, kind] of outputs) {
    const png = await page.evaluate(async ({ svg, size }) => {
      const image = new Image()
      image.src = `data:image/svg+xml;base64,${btoa(svg)}`
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = size
      const context = canvas.getContext('2d')
      if (!context) throw new Error('A 2D canvas context is required.')
      context.drawImage(image, 0, 0, size, size)
      return canvas.toDataURL('image/png').split(',')[1]
    }, { svg: iconSvg(kind), size })
    const destination = resolve(webRoot, path)
    await mkdir(dirname(destination), { recursive: true })
    await writeFile(destination, Buffer.from(png, 'base64'))
    console.log(`${path} (${size}×${size})`)
  }
} finally {
  await browser.close()
}
