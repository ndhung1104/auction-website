import { test, expect } from '@playwright/test'
import { clearAuthState, loginAsBidder } from './test-utils'

test.describe('Product detail', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
  })

  test('opens from the listing and shows bidder interactions', async ({ page }) => {
    await loginAsBidder(page)
    await page.goto('/products')

    const cards = page.locator('[data-testid="product-card"]')
    await expect(cards.first()).toBeVisible()

    const productLink = cards.first().getByRole('link')
    const productName = (await productLink.textContent())?.trim()
  await productLink.click()

  await expect(page).toHaveURL(/\/products\/\w+/)
  if (productName) {
    await expect(page.getByRole('heading', { name: productName })).toBeVisible()
  }

  await expect(page.getByText(/Current price:/i)).toBeVisible()

  const bidInput = page.getByLabel('Enter your bid amount')
  await expect(bidInput).toBeVisible()
  await expect(bidInput).toBeEnabled()

  await expect(page.getByRole('button', { name: /Place bid/i })).toBeEnabled()
  await expect(page.locator('main')).toContainText(/auto-bid|watchlist|question/i)
})
})
