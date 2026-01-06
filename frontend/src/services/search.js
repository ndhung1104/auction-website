import apiClient from './api'

export function searchProducts(term, { page = 1, limit, categoryId, sort } = {}) {
  const params = { q: term, page }
  if (limit) {
    params.limit = limit
  }
  if (categoryId) {
    params.categoryId = categoryId
  }
  if (sort) {
    params.sort = sort
  }
  return apiClient.get('/search', { params })
}
