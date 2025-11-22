import { test, expect } from '@playwright/test'
import { clearAuthState } from './test-utils'

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

test.describe('Product listing', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
  })

  test('renders products and supports sorting and pagination', async ({ page }) => {
    await page.goto('/products')

    await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible()

    const cards = page.locator('[data-testid="product-card"]')
    await expect(cards.first()).toBeVisible()

    await page.getByLabel('Sort by').selectOption('price,desc')
    await expect(page).toHaveURL(/sort=price%2Cdesc/)

    const nextButton = page.getByRole('button', { name: 'Next' })
    if (await nextButton.isDisabled()) {
      test.skip('Not enough seeded products for pagination checks')
    }

    const firstCardLink = cards.first().getByRole('link')
    const firstCardName = (await firstCardLink.textContent())?.trim() ?? ''

    await nextButton.click()
    await expect(page).toHaveURL(/page=\d+/)
    await expect(cards.first()).toBeVisible()

    if (firstCardName) {
      await expect(cards.first().getByRole('link')).not.toHaveText(new RegExp(`^${escapeRegExp(firstCardName)}$`))
    }
  })
})
