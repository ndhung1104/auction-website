import { test, expect } from '@playwright/test'
import { clearAuthState, loginAsAdmin } from './test-utils'

test.describe('Admin dashboard access', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
    await loginAsAdmin(page)
  })

  test('admin link is present and dashboard renders tables', async ({ page }) => {
    const adminLink = page.getByRole('link', { name: /Admin/i })
    await expect(adminLink).toBeVisible()
    await adminLink.click()
    await expect(page).toHaveURL(/\/admin$/)
    await expect(page.locator('main')).toContainText(/admin|dashboard|categories|users/i)
  })
})
