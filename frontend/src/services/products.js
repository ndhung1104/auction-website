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

export function createProduct(formData) {
  return apiClient.post('/products', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

export function placeManualBid(productId, payload) {
  return apiClient.post(`/products/${productId}/bid`, payload)
}

export function registerAutoBid(productId, payload) {
  return apiClient.post(`/products/${productId}/auto-bid`, payload)
}

export function buyNowProduct(productId) {
  return apiClient.post(`/products/${productId}/buy-now`)
}
