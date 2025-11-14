import apiClient from './api'

export function fetchHomepageSections() {
  return apiClient.get('/homepage')
}
