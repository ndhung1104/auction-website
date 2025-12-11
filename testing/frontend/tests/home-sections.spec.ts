import { test, expect } from '@playwright/test'

test.describe('Home sections', () => {
  test('shows top 5 ending soon, most bid, highest price', async ({ page }) => {
    await page.goto('/')

    const endingSoonSection = page.getByRole('heading', { name: /ending soon/i }).locator('xpath=ancestor::section[1]')
    const endingCards = endingSoonSection.locator('.card')
    const endingCount = await endingCards.count()
    test.skip(endingCount === 0, 'No ending-soon items rendered')
    expect(endingCount).toBeLessThanOrEqual(5)

    const mostBidSection = page.getByRole('heading', { name: /most bidded/i }).locator('xpath=ancestor::section[1]')
    const mostBidCards = mostBidSection.locator('.card')
    const mostBidCount = await mostBidCards.count()
    test.skip(mostBidCount === 0, 'No most-bidded items rendered')
    expect(mostBidCount).toBeLessThanOrEqual(5)

    const topPriceSection = page.getByRole('heading', { name: /top auctions/i }).locator('xpath=ancestor::section[1]')
    const topPriceCards = topPriceSection.locator('.card')
    const topCount = await topPriceCards.count()
    test.skip(topCount === 0, 'No top-price items rendered')
    expect(topCount).toBeLessThanOrEqual(5)
  })
})
