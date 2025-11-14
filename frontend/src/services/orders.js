import apiClient from './api'

export function fetchOrders() {
  return apiClient.get('/orders')
}

export function fetchOrderDetail(orderId) {
  return apiClient.get(`/orders/${orderId}`)
}

export function updateOrderStatus(orderId, payload) {
  return apiClient.patch(`/orders/${orderId}/status`, payload)
}

export function cancelOrder(orderId) {
  return apiClient.post(`/orders/${orderId}/cancel`)
}

export function sendOrderMessage(orderId, payload) {
  return apiClient.post(`/orders/${orderId}/messages`, payload)
}

export function rateOrder(orderId, payload) {
  return apiClient.post(`/orders/${orderId}/rating`, payload)
}
