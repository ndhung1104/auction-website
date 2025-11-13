import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { registerUser } from '../services/auth'

const DEFAULT_CAPTCHA = import.meta.env.VITE_RECAPTCHA_BYPASS || 'local-dev'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    password: '',
    captchaToken: DEFAULT_CAPTCHA
  })
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
      await registerUser(form)
      setAlert({ type: 'success', message: 'Registration successful. You can now log in.' })
      setTimeout(() => navigate('/login'), 1200)
    } catch (error) {
      setAlert({
        type: 'danger',
        message: error.message || 'Unable to register. Please try again.'
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="row justify-content-center">
      <div className="col-md-6 col-lg-5">
        <h1 className="mb-4">Create an Account</h1>
        {alert && (
          <div className={`alert alert-${alert.type}`} role="alert">
            {alert.message}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="fullName" className="form-label">
              Full name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              className="form-control"
              value={form.fullName}
              onChange={handleChange}
              required
            />
          </div>
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
          <div className="mb-3">
            <label htmlFor="phoneNumber" className="form-label">
              Phone number
            </label>
            <input
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              className="form-control"
              value={form.phoneNumber}
              onChange={handleChange}
            />
          </div>
          <div className="mb-3">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="form-control"
              value={form.password}
              onChange={handleChange}
              minLength={8}
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="captchaToken" className="form-label">
              Captcha token
            </label>
            <input
              id="captchaToken"
              name="captchaToken"
              type="text"
              className="form-control"
              value={form.captchaToken}
              onChange={handleChange}
              required
            />
            <div className="form-text">Use your reCAPTCHA token or the configured bypass token.</div>
          </div>
          <button type="submit" className="btn btn-primary w-100" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Register'}
          </button>
        </form>
      </div>
    </div>
  )
}
