import { expect } from '@playwright/test'

export const TEST_BIDDER_EMAIL = process.env.PLAYWRIGHT_BIDDER_EMAIL || 'bidder_w6@example.com'
export const TEST_BIDDER_PASSWORD = process.env.PLAYWRIGHT_BIDDER_PASSWORD || 'SellerPass123!'
export const TEST_FORGOT_EMAIL = process.env.PLAYWRIGHT_FORGOT_EMAIL || TEST_BIDDER_EMAIL
export const TEST_SELLER_EMAIL = process.env.PLAYWRIGHT_SELLER_EMAIL || 'seller_w6@example.com'
export const TEST_SELLER_PASSWORD = process.env.PLAYWRIGHT_SELLER_PASSWORD || 'SellerPass123!'
export const TEST_ADMIN_EMAIL = process.env.PLAYWRIGHT_ADMIN_EMAIL || 'admin_w6@example.com'
export const TEST_ADMIN_PASSWORD = process.env.PLAYWRIGHT_ADMIN_PASSWORD || 'SellerPass123!'
export const RECAPTCHA_BYPASS_TOKEN = process.env.PLAYWRIGHT_RECAPTCHA_BYPASS || 'local-dev'

export async function clearAuthState(page) {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage?.clear()
  })
  await page.context().clearCookies()
  await page.reload()
}

async function performLogin(page, { email, password }) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  const loginResponse = page.waitForResponse(
    (response) => response.url().includes('/auth/login') && response.request().method() === 'POST'
  )
  await page.getByRole('button', { name: /login/i }).click()
  await loginResponse
  await page.waitForURL(/\/$/)
  await expect(page.getByRole('button', { name: /logout/i })).toBeVisible()
}

export async function loginAsBidder(page, creds = {}) {
  const email = creds.email || TEST_BIDDER_EMAIL
  const password = creds.password || TEST_BIDDER_PASSWORD
  await performLogin(page, { email, password })
}

export async function loginAsSeller(page, creds = {}) {
  const email = creds.email || TEST_SELLER_EMAIL
  const password = creds.password || TEST_SELLER_PASSWORD
  await performLogin(page, { email, password })
}

export async function loginAsAdmin(page, creds = {}) {
  const email = creds.email || TEST_ADMIN_EMAIL
  const password = creds.password || TEST_ADMIN_PASSWORD
  await performLogin(page, { email, password })
}

export function createTestEmail(prefix = 'pw') {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  return `${prefix}-${unique}@example.com`
}
