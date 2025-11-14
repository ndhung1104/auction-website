import apiClient from './api'

export function fetchProfile() {
  return apiClient.get('/profile')
}

export function updateProfile(payload) {
  return apiClient.put('/profile', payload)
}

export function requestSellerUpgrade() {
  return apiClient.post('/seller/request-upgrade')
}
