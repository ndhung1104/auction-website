import { useState } from 'react'
import { requestPasswordReset } from '../services/auth'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [alert, setAlert] = useState(null)

  const handleSubmit = async (event) => {
    event.preventDefault()
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
            {alert.message}
          </div>
        )}
        <form onSubmit={handleSubmit}>
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
              required
            />
          </div>
          <button type="submit" className="btn btn-primary w-100" disabled={submitting}>
            {submitting ? 'Sending…' : 'Send reset instructions'}
          </button>
        </form>
      </div>
    </div>
  )
}
