import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { registerUser } from '../services/auth'
import { Link } from 'react-router-dom'

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
      setAlert({
        type: 'success',
        message: 'Registration successful. Enter the OTP we emailed to verify your account.'
      })
      setTimeout(() => navigate('/verify-email', { state: { email: form.email } }), 1200)
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
    <div className="row justify-content-center align-items-center py-5">
      <div className="col-md-7 col-lg-5 col-xl-5">
        <div className="card shadow-lg border-0 rounded-lg">
          <div className="card-body p-5">
            <h1 className="h3 fw-bold text-center mb-4 text-primary">Create Account</h1>

            {alert && (
              <div className={`alert alert-${alert.type} d-flex align-items-center`} role="alert">
                <small>{alert.message}</small>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="fullName" className="form-label text-secondary small fw-medium">
                  Full Name
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  className="form-control"
                  placeholder="John Doe"
                  value={form.fullName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="mb-3">
                <label htmlFor="email" className="form-label text-secondary small fw-medium">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className="form-control"
                  placeholder="name@example.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="mb-3">
                <label htmlFor="phoneNumber" className="form-label text-secondary small fw-medium">
                  Phone Number
                </label>
                <input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  className="form-control"
                  placeholder="+84..."
                  value={form.phoneNumber}
                  onChange={handleChange}
                />
              </div>
              <div className="mb-3">
                <label htmlFor="password" className="form-label text-secondary small fw-medium">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  className="form-control"
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={handleChange}
                  minLength={8}
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="captchaToken" className="form-label text-secondary small fw-medium">
                  Captcha Token
                </label>
                <input
                  id="captchaToken"
                  name="captchaToken"
                  type="text"
                  className="form-control bg-light"
                  value={form.captchaToken}
                  onChange={handleChange}
                  required
                />
                <div className="form-text small text-muted">Use your reCAPTCHA token or the configured bypass token.</div>
              </div>

              <button type="submit" className="btn btn-primary w-100 btn-lg fs-6 fw-bold mb-3" disabled={submitting}>
                {submitting ? 'Creating account…' : 'Create Account'}
              </button>
            </form>

            <div className="text-center text-muted small">
              Already have an account? <Link to="/login" className="fw-bold text-decoration-none">Sign in</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
