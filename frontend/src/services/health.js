// frontend/src/services/health.js
import apiClient from './api'
// Check backend health
export async function getHealthStatus() {
    const data = await apiClient.get('/health')
    return data
}