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
apiClient.interceptors.response.use(
  // success: only return data
  (response) => response.data,
  // error: normalize
  (error) => {
    const status = error.response?.status || 500
    const message =
      error.response?.data?.message || error.message || 'Unknown error'
    // return a consistent error object
    return Promise.reject({ status, message })
  }
)

export default apiClient
export { TOKEN_KEY, getToken }
