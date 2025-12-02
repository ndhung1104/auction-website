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

export function formatCountdown(targetDate) {
  if (!targetDate) return ''
  const target = targetDate instanceof Date ? targetDate : new Date(targetDate)
  if (isNaN(target)) return ''
  const diff = target.getTime() - Date.now()
  if (diff <= 0) return 'Ended'
  const minutes = Math.floor(diff / (1000 * 60))
  const days = Math.floor(minutes / (60 * 24))
  const hours = Math.floor((minutes % (60 * 24)) / 60)
  const mins = minutes % 60
  if (days > 0) {
    return `${days}d ${hours}h`
  }
  if (hours > 0) {
    return `${hours}h ${mins}m`
  }
  return `${mins}m`
}

// Relative time with fallback to absolute for long ranges
export function formatVNRelative(dateInput, { thresholdDays = 3 } = {}) {
  if (!dateInput) return ''
  const target = dateInput instanceof Date ? dateInput : new Date(dateInput)
  if (isNaN(target)) return ''

  const diffMs = target.getTime() - Date.now()
  const absMs = Math.abs(diffMs)
  const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000

  if (absMs > thresholdMs) {
    return formatVNTime(target)
  }

  const minutes = Math.max(0, Math.floor(absMs / (1000 * 60)))
  const days = Math.floor(minutes / (60 * 24))
  const hours = Math.floor((minutes % (60 * 24)) / 60)
  const mins = minutes % 60
  const parts = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (mins > 0 && days === 0) parts.push(`${mins}m`)
  const label = parts.join(' ') || '0m'

  return diffMs >= 0 ? `in ${label}` : `${label} ago`
}
