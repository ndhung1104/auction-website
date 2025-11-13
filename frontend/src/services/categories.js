import apiClient from './api'

export function fetchCategories() {
  return apiClient.get('/categories')
}
