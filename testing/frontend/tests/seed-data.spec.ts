import { test, expect } from '@playwright/test'
import { getSeedStatus } from './utils/seed'
import { seedEnabled, apiBaseURL } from './utils/env'

test.describe('Seed data sanity', () => {
  test('baseline counts satisfy checklist', async ({ request }) => {
    test.skip(!seedEnabled, 'Seeding disabled (PLAYWRIGHT_ENABLE_SEED is not true)')

    const status = await getSeedStatus(request)

    test.skip(
      !status,
      `Seed status endpoint unavailable at ${apiBaseURL} (set PLAYWRIGHT_SEED_STATUS_ENDPOINT if needed)`
    )

    expect(status?.productCount ?? 0).toBeGreaterThanOrEqual(20)
    expect(status?.categoryCount ?? 0).toBeGreaterThanOrEqual(4)
    expect(status?.minBidsPerProduct ?? 0).toBeGreaterThanOrEqual(5)
    expect(status?.minImagesPerProduct ?? 0).toBeGreaterThanOrEqual(4)
  })
})
