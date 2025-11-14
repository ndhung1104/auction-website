import apiClient from './api'

export function searchProducts(term, { page = 1, limit } = {}) {
  const params = { q: term, page }
  if (limit) {
    params.limit = limit
  }
  return apiClient.get('/search', { params })
}
