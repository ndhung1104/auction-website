import { Router } from 'express'
import { seedData, seedStatus } from '../controllers/testing.controller.js'

const router = Router()

const enabled =
  process.env.ENABLE_TEST_ENDPOINTS === 'true' || (process.env.NODE_ENV || '').toLowerCase() !== 'production'

if (enabled) {
  router.post('/seed', seedData)
  router.get('/seed-status', seedStatus)
} else {
  router.use((_, res) => res.sendStatus(404))
}

export default router
