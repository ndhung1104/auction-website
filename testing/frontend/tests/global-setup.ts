import { request, FullConfig } from '@playwright/test'
import { ensureBaselineSeeded } from './utils/seed'
import { createStorageState } from './utils/auth'
import { baseURL, apiBaseURL } from './utils/env'

const roles = ['guest', 'bidder', 'seller', 'admin'] as const

async function globalSetup(_config: FullConfig) {
  const api = await request.newContext({ baseURL: apiBaseURL })

  // Best-effort seed; do not hard fail to keep local runs flexible.
  await ensureBaselineSeeded(api)
  await api.dispose()

  for (const role of roles) {
    await createStorageState(role, { baseURL, apiBaseURL })
  }
}

export default globalSetup
