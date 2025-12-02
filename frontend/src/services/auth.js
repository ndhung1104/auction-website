import apiClient from './api'

export function registerUser(payload) {
  return apiClient.post('/auth/register', payload)
}

export function loginUser(payload) {
  return apiClient.post('/auth/login', payload)
}

export function requestPasswordReset(payload) {
  return apiClient.post('/auth/forgot-password', payload)
}

export function resetPassword(payload) {
  return apiClient.post('/auth/reset-password', payload)
}

export function refreshSession() {
  return apiClient.post('/auth/refresh')
}

export function logoutUser() {
  return apiClient.post('/auth/logout')
}

export function verifyEmail(payload) {
  return apiClient.post('/auth/verify-email', payload)
}

export function changePassword(payload) {
  return apiClient.post('/auth/change-password', payload)
}
