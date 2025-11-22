import { test, expect } from '@playwright/test'
import { clearAuthState, createTestEmail, RECAPTCHA_BYPASS_TOKEN } from './test-utils'

const DEFAULT_PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD || 'PlaywrightPass123!'

test.describe.serial('Registration flow', () => {
  let existingEmail = ''

  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
  })

  test('creates a brand-new account with captcha bypass', async ({ page }) => {
    existingEmail = createTestEmail('pw-bidder')
    await page.goto('/register')
    await page.getByLabel('Full name').fill('Playwright Bidder')
    await page.getByLabel('Email').fill(existingEmail)
    await page.getByLabel('Phone number').fill('0909000111')
    await page.getByLabel('Password').fill(DEFAULT_PASSWORD)
    await page.getByLabel('Captcha token').fill(RECAPTCHA_BYPASS_TOKEN)
    await page.getByRole('button', { name: /register/i }).click()

    const alert = page.getByRole('alert')
    await expect(alert).toBeVisible({ timeout: 15000 })
    await expect(alert).toContainText(/Registration successful/i)
    await page.waitForURL(/\/verify-email$/)
  })

  test('surfaces duplicate email validation errors', async ({ page }) => {
    test.skip(!existingEmail, 'Baseline registration did not run')
    await page.goto('/register')
    await page.getByLabel('Full name').fill('Playwright Bidder')
    await page.getByLabel('Email').fill(existingEmail)
    await page.getByLabel('Phone number').fill('0909000111')
    await page.getByLabel('Password').fill(DEFAULT_PASSWORD)
    await page.getByLabel('Captcha token').fill(RECAPTCHA_BYPASS_TOKEN)
    await page.getByRole('button', { name: /register/i }).click()

    const alert = page.getByRole('alert')
    await expect(alert).toBeVisible({ timeout: 15000 })
    await expect(alert).toContainText(/exists|Unable|AUTH/i)
  })
})
