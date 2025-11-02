// frontend/src/utils/format.js

// Format number to Vietnamese Dong currency
export function formatVND(amount) {
  if (amount == null || isNaN(amount)) return ''
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount)
}

// Format date/time in Vietnam timezone
export function formatVNTime(dateInput, options = {}) {
  if (!dateInput) return ''

  const date =
    dateInput instanceof Date ? dateInput : new Date(dateInput)

  if (isNaN(date)) return ''

  // Merge user-provided options with sensible defaults
  const fmtOptions = {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  }

  return new Intl.DateTimeFormat('vi-VN', fmtOptions).format(date)
}

// Optional: parse ISO string safely to Date (useful for backend timestamps)
export function parseISOToVN(dateString) {
  if (!dateString) return null
  const date = new Date(dateString)
  return isNaN(date) ? null : date
}
