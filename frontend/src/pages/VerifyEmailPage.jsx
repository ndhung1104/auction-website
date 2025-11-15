import { useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { verifyEmail } from '../services/auth'
import { useAuth } from '../contexts/AuthContext'

export default function VerifyEmailPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const initialEmail = location.state?.email || ''
  const [form, setForm] = useState({ email: initialEmail, code: '' })
  const [submitting, setSubmitting] = useState(false)
  const [alert, setAlert] = useState(null)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setAlert(null)
    try {
      const response = await verifyEmail(form)
      const payload = response?.data || {}
      if (payload.token && payload.user) {
        login(payload.token, payload.user)
      }
      setAlert({
        type: 'success',
        message: 'Your email has been verified. Redirecting to homepage...'
      })
      setTimeout(() => navigate('/'), 1200)
    } catch (error) {
      setAlert({
        type: 'danger',
        message: error.message || 'Unable to verify the code.'
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="row justify-content-center">
      <div className="col-md-6 col-lg-5">
        <h1 className="mb-4">Verify your account</h1>
        {alert && (
          <div className={`alert alert-${alert.type}`} role="alert">
            {alert.message}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="email" className="form-label">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="form-control"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="code" className="form-label">
              Verification code
            </label>
            <input
              id="code"
              name="code"
              className="form-control"
              value={form.code}
              onChange={handleChange}
              required
            />
            <div className="form-text">Enter the 6-digit code we emailed to you.</div>
          </div>
          <button type="submit" className="btn btn-primary w-100" disabled={submitting}>
            {submitting ? 'Verifying…' : 'Verify'}
          </button>
        </form>
      </div>
    </div>
  )
}
