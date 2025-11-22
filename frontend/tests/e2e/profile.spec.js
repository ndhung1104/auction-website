import { test, expect } from '@playwright/test'
import { clearAuthState, loginAsBidder } from './test-utils'

test.describe('Profile and orders flows', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
    await loginAsBidder(page)
  })

  test('profile page renders bidder controls', async ({ page }) => {
    await page.goto('/profile')
    await expect(page).toHaveURL(/\/profile$/)
    await expect(page.locator('main')).toContainText(/profile|account|watchlist/i)
  })

  test('orders page exposes the bidder order workflow shell', async ({ page }) => {
    await page.goto('/orders')
    await expect(page).toHaveURL(/\/orders$/)
    await expect(page.locator('main')).toContainText(/orders|timeline|tracking|rating/i)
  })
})
