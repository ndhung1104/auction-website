import apiClient from './api'

export function searchProducts(term, { page = 1, limit, categoryId, sort, filters = {} } = {}) {
  const params = { q: term, page, ...filters }
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
