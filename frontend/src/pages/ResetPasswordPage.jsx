import { useState } from 'react'
import { resetPassword } from '../services/auth'

export default function ResetPasswordPage() {
  const [form, setForm] = useState({ token: '', newPassword: '' })
  const [status, setStatus] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = {
    }
    if (!form.token.trim()) {
      nextErrors.token = 'Reset token is required.'
    }
    if (!form.newPassword) {
      nextErrors.newPassword = 'New password is required.'
    } else if (form.newPassword.length < 8) {
      nextErrors.newPassword = 'Password must be at least 8 characters.'
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      setStatus(null)
      return
    }
    setErrors({})
    setSubmitting(true)
    setStatus(null)
    try {
      await resetPassword(form)
      setStatus({ type: 'success', message: 'Password updated. You may now login.' })
      setForm({ token: '', newPassword: '' })
    } catch (err) {
      setStatus({ type: 'danger', message: err.message || 'Unable to reset password' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="row justify-content-center">
      <div className="col-md-6 col-lg-5">
        <h1 className="mb-4">Reset password</h1>
        {status && (
          <div className={`alert alert-${status.type}`}>
            {status.message}
          </div>
        )}
        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label htmlFor="token" className="form-label">
              Reset token
            </label>
            <input
              id="token"
              name="token"
              className="form-control"
              value={form.token}
              onChange={handleChange}
            />
            {errors.token && <div className="text-danger small mt-1">{errors.token}</div>}
          </div>
          <div className="mb-4">
            <label htmlFor="newPassword" className="form-label">
              New password
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              className="form-control"
              value={form.newPassword}
              onChange={handleChange}
            />
            {errors.newPassword && <div className="text-danger small mt-1">{errors.newPassword}</div>}
          </div>
          <button type="submit" className="btn btn-primary w-100" disabled={submitting}>
            {submitting ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  )
}
