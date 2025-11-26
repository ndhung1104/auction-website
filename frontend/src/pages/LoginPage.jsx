import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { loginUser } from '../services/auth'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
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
      const response = await loginUser(form)
      const { token, user } = response.data || {}
      if (!token || !user) {
        throw new Error('Malformed login response')
      }
      login(token, user)
      navigate('/')
    } catch (error) {
      setAlert({
        type: 'danger',
        message: error.message || 'Invalid email or password'
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="row justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
      <div className="col-md-6 col-lg-5 col-xl-4">
        <div className="card shadow-lg border-0 rounded-lg">
          <div className="card-body p-5">
            <h1 className="h3 fw-bold text-center mb-4 text-primary">Sign In</h1>

            {alert && (
              <div className={`alert alert-${alert.type} d-flex align-items-center`} role="alert">
                <small>{alert.message}</small>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="email" className="form-label text-secondary small fw-medium">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className="form-control form-control-lg fs-6"
                  placeholder="name@example.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label htmlFor="password" className="form-label text-secondary small fw-medium mb-0">
                    Password
                  </label>
                  <Link to="/forgot-password" class="text-decoration-none small">
                    Forgot password?
                  </Link>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  className="form-control form-control-lg fs-6"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary w-100 btn-lg fs-6 fw-bold mb-3" disabled={submitting}>
                {submitting ? 'Signing in…' : 'Sign In'}
              </button>
            </form>

            <div className="text-center text-muted small">
              Don't have an account? <Link to="/register" className="fw-bold text-decoration-none">Create account</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
