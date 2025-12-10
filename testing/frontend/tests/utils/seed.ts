import { APIRequestContext } from '@playwright/test'
import { seedEndpoint, seedStatusEndpoint, seedEnabled, apiBaseURL } from './env'

type SeedOptions = {
  products?: number
  categories?: number
  bidsPerProduct?: number
  imagesPerProduct?: number
  autoBidSettings?: Record<string, unknown>
}

type SeedStatus = {
  productCount?: number
  categoryCount?: number
  minBidsPerProduct?: number
  minImagesPerProduct?: number
}

const defaultOptions: Required<SeedOptions> = {
  products: 20,
  categories: 4,
  bidsPerProduct: 5,
  imagesPerProduct: 4,
  autoBidSettings: {},
}

export function buildDynamicTimestamps() {
  const now = new Date()
  const endingSoon = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000) // <3 days
  const newWithinNMinutes = new Date(now.getTime() - 5 * 60 * 1000) // last 5 minutes
  const older = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // a week ago

  return {
    endingSoonAt: endingSoon.toISOString(),
    newProductPostedAt: newWithinNMinutes.toISOString(),
    oldProductPostedAt: older.toISOString(),
  }
}

export async function seedBaseline(
  api: APIRequestContext,
  options: SeedOptions = defaultOptions
): Promise<boolean> {
  if (!seedEnabled) return false
  try {
    const timestamps = buildDynamicTimestamps()
    const payload = {
      ...defaultOptions,
      ...options,
      timestamps,
    }
    const response = await api.post(`${apiBaseURL}${seedEndpoint}`, {
      data: payload,
    })
    return response.ok()
  } catch (err) {
    console.warn('Seed failed or endpoint unavailable:', err)
    return false
  }
}

export async function ensureBaselineSeeded(api: APIRequestContext) {
  if (!seedEnabled) {
    return
  }
  const seeded = await seedBaseline(api)
  if (!seeded) {
    console.warn('Baseline seed skipped (endpoint may be missing).')
  }
}

export async function getSeedStatus(api: APIRequestContext): Promise<SeedStatus | null> {
  if (!seedEnabled) return null
  try {
    const res = await api.get(`${apiBaseURL}${seedStatusEndpoint}`)
    if (!res.ok()) return null
    const body = (await res.json()) as any
    return (body?.data || body) as SeedStatus
  } catch (err) {
    console.warn('Seed status unavailable:', err)
    return null
  }
}
