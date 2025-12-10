import { chromium, APIRequestContext } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { authStorageKey, credentials, loginEndpoint } from './env'

type Role = 'guest' | 'bidder' | 'seller' | 'admin'

type CreateStorageOptions = {
  baseURL: string
  apiBaseURL: string
  storageDir?: string
}

async function loginViaApi(api: APIRequestContext, email?: string, password?: string) {
  if (!email || !password) return null

  try {
    const res = await api.post(loginEndpoint, {
      data: { email, password },
    })
    if (!res.ok()) return null
    const body = (await res.json()) as { token?: string }
    return body.token || null
  } catch {
    return null
  }
}

export async function createStorageState(role: Role, opts: CreateStorageOptions) {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const storageDir =
    opts.storageDir || path.resolve(path.join(__dirname, '..', '..', 'storage-states'))
  fs.mkdirSync(storageDir, { recursive: true })
  const storagePath = path.join(storageDir, `${role}.json`)

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ baseURL: opts.baseURL })
  const page = await context.newPage()

  if (role !== 'guest') {
    const email = credentials[role]?.email
    const password = credentials[role]?.password
    const token = await loginViaApi(context.request, email, password)
    if (token) {
      await context.addInitScript(
        ([key, value]) => {
          window.localStorage.setItem(key, value)
        },
        [authStorageKey, token]
      )
    }
  }

  await page.goto(opts.baseURL || 'about:blank')
  await context.storageState({ path: storagePath })
  await browser.close()
}
