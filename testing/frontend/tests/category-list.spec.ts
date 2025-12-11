import { test, expect } from '@playwright/test'

test.describe('Category listing', () => {
  test('filters by category, paginates, and shows required fields', async ({ page }) => {
    await page.goto('/products')

    // Use the categories dropdown in navbar footer or sidebar (reuse navbar)
    await page.getByRole('button', { name: /categories/i }).click()
    const categoryLink = page.locator('.dropdown-menu-categories a').first()
    const hasCategory = await categoryLink.count()
    expect(hasCategory).toBeGreaterThan(0)
    await categoryLink.click()

    const cards = page.locator('.product-card-image')
    const cardCount = await cards.count()
    expect(cardCount).toBeGreaterThan(0)

    const firstCard = page.locator('.card').first()
    await expect(firstCard.getByRole('link')).toBeVisible()
    await expect(firstCard.locator('.product-card-image')).toBeVisible()
    await expect(firstCard).toContainText('Current price')
    await expect(firstCard).toContainText('Bidder')
    await expect(firstCard).toContainText('Bids')
    await expect(firstCard).toContainText('Posted')

    // Pagination check
    const nextPage = page.getByRole('button', { name: /next/i })
    if (await nextPage.isVisible()) {
      await nextPage.click()
      await expect(page).toHaveURL(/page=2/)
    }
  })
})
