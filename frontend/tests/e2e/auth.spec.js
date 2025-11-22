import { test, expect } from '@playwright/test'
import { clearAuthState, loginAsBidder, TEST_BIDDER_EMAIL, TEST_BIDDER_PASSWORD, TEST_FORGOT_EMAIL } from './test-utils'

test.describe('Authentication flows', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
  })

  test('logs in successfully with a known bidder account', async ({ page }) => {
    await loginAsBidder(page, {
      email: TEST_BIDDER_EMAIL,
      password: TEST_BIDDER_PASSWORD,
    })
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('button', { name: /logout/i })).toBeVisible()
  })

  test('shows an error for invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(TEST_BIDDER_EMAIL)
    await page.getByLabel('Password').fill('DefinitelyWrong123!')
    await page.getByRole('button', { name: /login/i }).click()
    const alert = page.getByRole('alert')
    await expect(alert).toBeVisible()
    await expect(alert).toContainText(/invalid|auth/i)
  })

  test('forgot password form confirms the request', async ({ page }) => {
    await page.goto('/forgot-password')
    await page.getByLabel('Email').fill(TEST_FORGOT_EMAIL)
    await page.getByRole('button', { name: /send reset instructions/i }).click()
    const alert = page.getByRole('alert')
    await expect(alert).toBeVisible({ timeout: 15000 })
    await expect(alert).toContainText(/If the account exists/i)
    await expect(page.getByRole('link', { name: /Enter your new password here/i })).toBeVisible()
  })
})
