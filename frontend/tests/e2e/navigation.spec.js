import { test, expect } from '@playwright/test'
import { clearAuthState, loginAsBidder } from './test-utils'

async function expandNavbarIfCollapsed(page) {
  const toggler = page.getByRole('button', { name: /toggle navigation/i })
  if (await toggler.isVisible()) {
    await toggler.click()
  }
}

test.describe('Main navigation and layout', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
  })

  test('public navbar exposes core routes, categories, and search', async ({ page }) => {
    await page.goto('/')
    await expandNavbarIfCollapsed(page)
    await expect(page.getByRole('link', { name: 'Home' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Products' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Login' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Register' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Categories/i })).toBeVisible()
    await expect(page.getByPlaceholder('Search products...')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Go' })).toBeVisible()
  })

  test('authenticated bidder sees profile/orders/logout links', async ({ page }) => {
    await loginAsBidder(page)
    await expandNavbarIfCollapsed(page)
    await expect(page.getByRole('link', { name: 'Profile' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Orders' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Logout/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Create product/i })).toHaveCount(0)
  })
})
