// frontend/src/pages/HomePage.jsx
import { useEffect, useState } from 'react'
import { getHealthStatus } from '../services/health'

export default function HomePage() {
  const [status, setStatus] = useState('checking…')
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true
    getHealthStatus()
      .then(({ status: apiStatus }) => {
        if (isMounted) setStatus(apiStatus ?? 'ok')
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'Server unavailable')
      })
    return () => { isMounted = false }
  }, [])

  return (
    <>
      <h1>Home</h1>
      <div className="alert alert-info mt-3">
        {error ? `Backend offline: ${error}` : `Backend health: ${status}`}
      </div>
    </>
  )
}