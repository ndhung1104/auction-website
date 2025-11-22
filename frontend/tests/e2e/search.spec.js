import { test, expect } from '@playwright/test'
import { clearAuthState } from './test-utils'

test.describe('Global search', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
  })

  test('search page accepts a keyword and renders the results shell', async ({ page }) => {
    await page.goto('/search')
    await page.getByPlaceholder('Search products...').fill('Week8')
    await page.getByRole('button', { name: /^Search$/i }).click()
    await expect(page).toHaveURL(/\/search\?q=Week8/i)
    await expect(page.getByRole('heading', { name: 'Search' })).toBeVisible()
    // Either product cards render or the empty-state message appears when no matches exist.
    const cards = page.locator('[data-testid="product-card"]')
    if ((await cards.count()) === 0) {
      await expect(page.getByText(/No products match/i)).toBeVisible()
    }
  })
})
