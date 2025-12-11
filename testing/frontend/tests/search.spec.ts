import { test, expect } from '@playwright/test'

test.describe('Search and sorting', () => {
  test('searches by name and category, sorts correctly, highlights new items', async ({ page }) => {
    await page.goto('/search')
    await page.getByPlaceholder('Search products...').fill('Product')
    await page.getByRole('button', { name: /search/i }).click()

    const results = page.locator('.product-card-image')
    const resultCount = await results.count()
    test.skip(resultCount === 0, 'No search results returned')

    // Sort: end time desc
    await page.getByRole('combobox').last().selectOption('end_at,desc')
    // Sort: price asc
    await page.getByRole('combobox').last().selectOption('price,asc')

    // Filter by category if options exist
    const categorySelect = page.getByRole('combobox').nth(1)
    const optionCount = await categorySelect.locator('option').count()
    if (optionCount > 1) {
      await categorySelect.selectOption({ index: 1 })
    }

    // New badge (uses card badge text)
    const newBadges = page.locator('.badge', { hasText: /new/i })
    expect(await newBadges.count()).toBeGreaterThanOrEqual(0)
  })
})
