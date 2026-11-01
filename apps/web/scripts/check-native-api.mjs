import { loadEnv } from 'vite'

const value = process.env.VITE_API_BASE_URL || loadEnv('production', process.cwd(), 'VITE_').VITE_API_BASE_URL
let url
try { url = new URL(value) } catch { /* Report a single actionable configuration error below. */ }
if (!url || url.protocol !== 'https:' || ['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname)) {
  console.error('Set VITE_API_BASE_URL to your reachable HTTPS backend /api/v1 URL in apps/web/.env.production before building Android.')
  process.exit(1)
}
