import { useState } from 'react'
import { Link } from 'react-router-dom'
import { requestPasswordReset } from '../services/auth'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [alert, setAlert] = useState(null)
  const [errors, setErrors] = useState({})

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = {
    }
    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      nextErrors.email = 'Email is required.'
    } else if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      nextErrors.email = 'Enter a valid email address.'
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      setAlert(null)
      return
    }
    setErrors({})
    setSubmitting(true)
    setAlert(null)
    try {
      const response = await requestPasswordReset({ email })
      const extra =
        response?.data?.resetToken && response?.data?.expiresAt
          ? ` Token: ${response.data.resetToken} (expires ${new Date(response.data.expiresAt).toLocaleString()}).`
          : ''
      setAlert({
        type: 'success',
        message: `If the account exists, reset instructions have been sent.${extra}`
      })
      setEmail('')
    } catch (error) {
      setAlert({
        type: 'danger',
        message: error.message || 'Unable to process request.'
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="row justify-content-center">
      <div className="col-md-6 col-lg-5">
        <h1 className="mb-4">Forgot password</h1>
        {alert && (
          <div className={`alert alert-${alert.type}`} role="alert">
            {alert.message}{' '}
            {alert.type === 'success' && (
              <span>
                Ready to reset? <Link to="/reset-password">Enter your new password here.</Link>
              </span>
            )}
          </div>
        )}
        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-4">
            <label htmlFor="email" className="form-label">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="form-control"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            {errors.email && <div className="text-danger small mt-1">{errors.email}</div>}
          </div>
          <button type="submit" className="btn btn-primary w-100" disabled={submitting}>
            {submitting ? 'Sending...' : 'Send reset instructions'}
          </button>
        </form>
      </div>
    </div>
  )
}
