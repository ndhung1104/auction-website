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
