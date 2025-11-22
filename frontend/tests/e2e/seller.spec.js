import { test, expect } from '@playwright/test'
import { clearAuthState, loginAsSeller } from './test-utils'

test.describe('Seller tooling', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
    await loginAsSeller(page)
  })

  test('seller sees create product navigation and form', async ({ page }) => {
    const createLink = page.getByRole('link', { name: /Create product/i })
    await expect(createLink).toBeVisible()
    await createLink.click()
    await expect(page).toHaveURL(/\/sell\/create$/)
    await expect(page.locator('form')).toBeVisible()
    await expect(page.locator('main')).toContainText(/auto-bid|buy now|auto extend/i)
  })
})
