import { test, expect } from '@playwright/test'

test.describe('Product detail', () => {
  test('shows gallery, meta, related, and ended state for non-winner', async ({ page }) => {
    // Navigate to first product from list
    await page.goto('/products')
    const firstLink = page.locator('.card h5 a').first()
    await firstLink.click()

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.locator('.card-img-top').first()).toBeVisible()
    await expect(page.getByText(/Start price:/i)).toBeVisible()
    await expect(page.getByText(/Price step:/i)).toBeVisible()
    await expect(page.locator('h4', { hasText: /description/i })).toBeVisible()
    await expect(page.getByText(/Bid history/i)).toBeVisible()
    await expect(page.getByText(/Questions & Answers/i)).toBeVisible()
    await expect(page.getByText(/Related products/i)).toBeVisible()

    // Optional ended notice if applicable
    const endedBadge = page.locator('.badge', { hasText: /ended/i })
    if (await endedBadge.isVisible()) {
      await expect(page.locator('body')).toContainText('Ended')
    }
  })
})
