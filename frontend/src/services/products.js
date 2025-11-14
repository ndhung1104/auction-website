import apiClient from './api'

export function fetchProducts(params = {}) {
  return apiClient.get('/products', { params })
}

export function fetchProductDetail(productId) {
  return apiClient.get(`/products/${productId}`)
}

export function fetchProductBids(productId, params = {}) {
  return apiClient.get(`/products/${productId}/bids`, { params })
}
