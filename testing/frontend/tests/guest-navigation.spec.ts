import { test, expect } from '@playwright/test'

test.describe('Guest navigation and menus', () => {
  test('shows 2-level menu and category click-through', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('button', { name: /categories/i }).click()
    const topCategories = page.locator('.dropdown-menu-categories li > div > a')
    const topCount = await topCategories.count()
    expect(topCount).toBeGreaterThan(0)

    const firstSub = topCategories.first()
    await firstSub.click()
    await expect(page).toHaveURL(/\/products\?categoryId=/)
    await expect(page.getByRole('heading', { level: 1, name: /products/i })).toBeVisible()
    await expect(page.locator('.product-card-image').first()).toBeVisible()
  })
})
