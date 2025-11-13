import apiClient from './api'

export function fetchProducts(params = {}) {
  return apiClient.get('/products', { params })
}
