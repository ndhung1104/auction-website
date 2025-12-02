// frontend/src/services/api.js
import axios from 'axios'

// 1) centralize token key
const TOKEN_KEY = 'authToken'

// 2) helper to get token (later you can add sessionStorage, cookies, etc.)
function getToken() {
  return localStorage.getItem(TOKEN_KEY) || null
}

// 3) create axios instance
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 10000, // 10s
  withCredentials: true,
})

// 4) request interceptor: attach token safely
apiClient.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) {
      // guard headers
      config.headers = config.headers || {}
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  // if request setup itself failed, just reject
  (error) => Promise.reject(error)
)

// 5) response interceptor: unwrap data + normalize errors
let refreshPromise = null

apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const status = error.response?.status || 500
    const originalRequest = error.config || {}

    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      refreshPromise =
        refreshPromise ||
        apiClient
          .post('/auth/refresh')
          .then((data) => {
            const newToken = data?.data?.token
            if (newToken) {
              localStorage.setItem(TOKEN_KEY, newToken)
            }
            return newToken
          })
          .finally(() => {
            refreshPromise = null
          })

      try {
        const token = await refreshPromise
        if (token) {
          originalRequest.headers = originalRequest.headers || {}
          originalRequest.headers.Authorization = `Bearer ${token}`
        }
        return apiClient(originalRequest)
      } catch (refreshError) {
        localStorage.removeItem(TOKEN_KEY)
        return Promise.reject(refreshError)
      }
    }

    const message =
      error.response?.data?.message || error.message || 'Unknown error'
    return Promise.reject({ status, message })
  }
)

export default apiClient
export { TOKEN_KEY, getToken }
