import axios from 'axios';

const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
    timeout: 10000,
});

apiClient.interceptors.request.use((config) => {
    const token = LocalStorage.getItem('authToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

apiClient.interceptors.response.use((response) => {
    return response;
}, (error) => {
    const status = error.response ? error.response.status : null;
    const message = error.response && error.response.data && error.response.data.message
    throw (status, message || 'An unexpected error occurred');
});

export default apiClient;