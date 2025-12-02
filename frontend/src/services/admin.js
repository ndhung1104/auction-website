import apiClient from './api'

export function fetchAdminDashboard() {
  return apiClient.get('/admin/dashboard')
}

export function createCategory(payload) {
  return apiClient.post('/admin/categories', payload)
}

export function updateCategory(id, payload) {
  return apiClient.put(`/admin/categories/${id}`, payload)
}

export function deleteCategory(id) {
  return apiClient.delete(`/admin/categories/${id}`)
}

export function updateUser(id, payload) {
  return apiClient.patch(`/admin/users/${id}`, payload)
}

export function deleteUser(id) {
  return apiClient.delete(`/admin/users/${id}`)
}

export function softDeleteProduct(id) {
  return apiClient.patch(`/admin/products/${id}/status`)
}

export function fetchProductAutoBids(id) {
  return apiClient.get(`/admin/products/${id}/auto-bids`)
}

export function approveSellerRequest(id) {
  return apiClient.post(`/admin/seller-requests/${id}/approve`)
}

export function rejectSellerRequest(id) {
  return apiClient.post(`/admin/seller-requests/${id}/reject`)
}
