import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchProfile, requestSellerUpgrade, updateProfile } from '../services/profile'
import { changePassword } from '../services/auth'
import { useAuth } from '../contexts/AuthContext'

export default function ProfilePage() {
  const { user, setUser } = useAuth()
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({ email: '', fullName: '', phoneNumber: '', address: '', dateOfBirth: '' })
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const [alert, setAlert] = useState(null)
  const [profileErrors, setProfileErrors] = useState({})
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [passwordAlert, setPasswordAlert] = useState(null)
  const [passwordErrors, setPasswordErrors] = useState({})
  const [passwordSubmitting, setPasswordSubmitting] = useState(false)

  useEffect(() => {
    let isMounted = true
    setLoading(true)
    fetchProfile()
      .then((response) => {
        if (!isMounted) return
        const data = response.data || {}
        setProfile(data)
        setForm({
          email: data.user?.email || '',
          fullName: data.user?.fullName || '',
          phoneNumber: data.user?.phoneNumber || '',
          address: data.user?.address || '',
          dateOfBirth: data.user?.dateOfBirth?.slice(0, 10) || ''
        })
      })
      .catch((error) => {
        if (!isMounted) return
        setAlert({
          type: 'danger',
          message: error.message || 'Unable to load profile'
        })
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handlePasswordFieldChange = (event) => {
    const { name, value } = event.target
    setPasswordForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = {
    }
    const trimmedEmail = form.email.trim()
    if (!trimmedEmail) {
      nextErrors.email = 'Email is required.'
    } else if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      nextErrors.email = 'Enter a valid email address.'
    }
    if (!form.fullName.trim()) {
      nextErrors.fullName = 'Full name is required.'
    }
    if (Object.keys(nextErrors).length > 0) {
      setProfileErrors(nextErrors)
      setAlert(null)
      return
    }
    setProfileErrors({})
    setUpdating(true)
    setAlert(null)
    try {
      const response = await updateProfile(form)
      const updatedUser = response?.data?.user
      setProfile((prev) => (prev ? { ...prev, user: updatedUser } : prev))
      if (updatedUser) {
        setUser((prev) => ({ ...(prev || {}), fullName: updatedUser.fullName, email: updatedUser.email }))
      }
      setAlert({ type: 'success', message: 'Profile updated successfully' })
    } catch (error) {
      setAlert({ type: 'danger', message: error.message || 'Unable to update profile' })
    } finally {
      setUpdating(false)
    }
  }

  const handlePasswordSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = {
    }
    if (!passwordForm.currentPassword) {
      nextErrors.currentPassword = 'Current password is required.'
    }
    if (!passwordForm.newPassword) {
      nextErrors.newPassword = 'New password is required.'
    } else if (passwordForm.newPassword.length < 8) {
      nextErrors.newPassword = 'New password must be at least 8 characters.'
    }
    if (!passwordForm.confirmPassword) {
      nextErrors.confirmPassword = 'Please confirm your new password.'
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      nextErrors.confirmPassword = 'New passwords do not match.'
    }
    if (Object.keys(nextErrors).length > 0) {
      setPasswordErrors(nextErrors)
      setPasswordAlert(null)
      return
    }
    setPasswordErrors({})
    setPasswordSubmitting(true)
    setPasswordAlert(null)
    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      })
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setPasswordAlert({ type: 'success', message: 'Password updated successfully.' })
    } catch (error) {
      setPasswordAlert({ type: 'danger', message: error.message || 'Unable to change password.' })
    } finally {
      setPasswordSubmitting(false)
    }
  }

  const handleSellerRequest = async () => {
    setRequesting(true)
    setAlert(null)
    try {
      const response = await requestSellerUpgrade()
      const request = response?.data?.request
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              sellerRequest: request,
              canRequestSeller: false
            }
          : prev
      )
      setAlert({
        type: 'success',
        message: 'Seller upgrade request submitted'
      })
    } catch (error) {
      setAlert({
        type: 'danger',
        message: error.message || 'Unable to submit seller request'
      })
    } finally {
      setRequesting(false)
    }
  }

  if (loading) {
    return <div className="alert alert-info">Loading profile…</div>
  }

  if (!profile) {
    return <div className="alert alert-danger">Profile unavailable.</div>
  }

  const { user: profileUser, rating, sellerRequest, canRequestSeller } = profile

  const watchlist = profile.watchlist || []
  const activeBids = profile.activeBids || []
  const wonAuctions = profile.wonAuctions || []
  const sellerListings = profile.sellerListings || { active: [], ended: [] }
  const ratingHistory = profile.ratingHistory || []
  const positiveRatings = Number(rating?.positive || 0)
  const negativeRatings = Number(rating?.negative || 0)
  const totalRatings = positiveRatings + negativeRatings
  const ratingPercent = totalRatings > 0 ? Math.round((positiveRatings / totalRatings) * 100) : null

  const renderProductList = (items, emptyLabel, options = {}) => {
    if (!items.length) {
      return <div className="alert alert-light mb-0">{emptyLabel}</div>
    }
    const { showPosition = false, showStatusBadge = false } = options
    return (
      <div className="table-responsive">
        <table className="table table-sm">
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              {showPosition && <th>Position</th>}
              <th>Price</th>
              <th>Ends</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  {item.slug ? (
                    <Link to={`/products/${item.id}`}>{item.name}</Link>
                  ) : (
                    item.name
                  )}
                </td>
                <td>
                  {showStatusBadge ? (
                    <span
                      className={`badge ${
                        item.status === 'ACTIVE'
                          ? 'bg-success'
                          : item.status === 'ENDED'
                            ? 'bg-secondary'
                            : item.status === 'REMOVED'
                              ? 'bg-danger'
                              : 'bg-light text-dark'
                      }`}
                    >
                      {item.status}
                    </span>
                  ) : (
                    item.status
                  )}
                </td>
                {showPosition && (
                  <td>
                    <span className={`badge ${item.isLeading ? 'bg-success' : 'bg-warning text-dark'}`}>
                      {item.isLeading ? 'Leading' : 'Outbid'}
                    </span>
                  </td>
                )}
                <td>{item.currentPrice?.toLocaleString('vi-VN')}</td>
                <td>{new Date(item.endAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="profile-page">
      <div className="row g-4">
        <div className="col-lg-5 d-flex flex-column gap-4 h-100">
          <div className="card shadow-sm">
            <div className="card-body">
              <h3 className="card-title mb-3">Account overview</h3>
              <p className="mb-1">
                <strong>Email:</strong> {profileUser.email}
              </p>
              <p className="mb-1">
                <strong>Role:</strong> {profileUser.role}
              </p>
              <p className="mb-3">
                <strong>Status:</strong> {profileUser.status}
              </p>
              {profileUser.dateOfBirth && (
                <p className="mb-3">
                  <strong>Date of birth:</strong> {new Date(profileUser.dateOfBirth).toLocaleDateString()}
                </p>
              )}
              <div className="mb-3">
                <strong>Rating:</strong>{' '}
                <span className="badge bg-success me-2">+{positiveRatings}</span>
                <span className="badge bg-danger">-{negativeRatings}</span>
                <span className="ms-2 text-muted small">
                  Positive: {ratingPercent === null ? 'N/A' : `${ratingPercent}%`}
                </span>
              </div>
              {sellerRequest && (
                <div className="alert alert-secondary">
                  <p className="mb-1">
                    <strong>Seller request:</strong> {sellerRequest.status}
                  </p>
                  <small className="text-muted">
                    Requested at {new Date(sellerRequest.requestedAt).toLocaleString()}
                  </small>
                </div>
              )}
              {profileUser.role === 'BIDDER' && (
                <button
                  type="button"
                  className="btn btn-outline-primary"
                  onClick={handleSellerRequest}
                  disabled={!canRequestSeller || requesting}
                >
                  {requesting ? 'Submitting…' : 'Request Seller Upgrade'}
                </button>
              )}
            </div>
          </div>
          <div className="card shadow-sm flex-grow-1">
            <div className="card-body">
              <h3 className="card-title mb-3">Change password</h3>
              {passwordAlert && (
                <div className={`alert alert-${passwordAlert.type}`} role="alert">
                  {passwordAlert.message}
                </div>
              )}
              <form onSubmit={handlePasswordSubmit} noValidate>
                <div className="mb-3">
                  <label htmlFor="currentPassword" className="form-label">
                    Current password
                  </label>
                  <input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    className="form-control"
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordFieldChange}
                  />
                  {passwordErrors.currentPassword && <div className="text-danger small mt-1">{passwordErrors.currentPassword}</div>}
                </div>
                <div className="mb-3">
                  <label htmlFor="newPassword" className="form-label">
                    New password
                  </label>
                  <input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    className="form-control"
                    value={passwordForm.newPassword}
                    onChange={handlePasswordFieldChange}
                  />
                  {passwordErrors.newPassword && <div className="text-danger small mt-1">{passwordErrors.newPassword}</div>}
                </div>
                <div className="mb-3">
                  <label htmlFor="confirmPassword" className="form-label">
                    Confirm new password
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    className="form-control"
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordFieldChange}
                  />
                  {passwordErrors.confirmPassword && <div className="text-danger small mt-1">{passwordErrors.confirmPassword}</div>}
                </div>
                <button type="submit" className="btn btn-outline-primary" disabled={passwordSubmitting}>
                  {passwordSubmitting ? 'Updating…' : 'Update password'}
                </button>
              </form>
            </div>
          </div>
        </div>
        <div className="col-lg-7">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h3 className="card-title mb-3">Edit profile</h3>
              {alert && (
                <div className={`alert alert-${alert.type}`} role="alert">
                  {alert.message}
                </div>
              )}
              <form onSubmit={handleSubmit} noValidate>
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
                  />
                  {profileErrors.email && <div className="text-danger small mt-1">{profileErrors.email}</div>}
                </div>
                <div className="mb-3">
                  <label htmlFor="fullName" className="form-label">
                    Full name
                  </label>
                  <input
                    id="fullName"
                    name="fullName"
                    className="form-control"
                    value={form.fullName}
                    onChange={handleChange}
                  />
                  {profileErrors.fullName && <div className="text-danger small mt-1">{profileErrors.fullName}</div>}
                </div>
                <div className="mb-3">
                  <label htmlFor="phoneNumber" className="form-label">
                    Phone number
                  </label>
                  <input
                    id="phoneNumber"
                    name="phoneNumber"
                    className="form-control"
                    value={form.phoneNumber}
                    onChange={handleChange}
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="dateOfBirth" className="form-label">
                    Date of birth
                  </label>
                  <input
                    id="dateOfBirth"
                    name="dateOfBirth"
                    type="date"
                    className="form-control"
                    value={form.dateOfBirth}
                    onChange={handleChange}
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="address" className="form-label">
                    Address
                  </label>
                  <textarea
                    id="address"
                    name="address"
                    className="form-control"
                    rows="3"
                    value={form.address}
                    onChange={handleChange}
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={updating}>
                  {updating ? 'Saving…' : 'Save changes'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
      <section className="mt-5">
        <h3>Watchlist</h3>
        {renderProductList(watchlist, 'Your watchlist is empty.')}
      </section>
      <section className="mt-4">
        <h3>Active bids</h3>
        {renderProductList(activeBids, 'You have no active bids.', { showPosition: true, showStatusBadge: true })}
      </section>
      <section className="mt-4 mb-5">
        <h3>Won auctions</h3>
        {renderProductList(wonAuctions, 'You have not won any auctions yet.')}
      </section>
      {profileUser.role === 'SELLER' && (
        <>
          <section className="mt-4">
            <h3>Your active listings</h3>
            {renderProductList(sellerListings.active, 'You have no active listings.')}
          </section>
          <section className="mt-4">
            <h3>Recently ended listings</h3>
            {renderProductList(sellerListings.ended, 'No listings have ended recently.')}
          </section>
        </>
      )}
      <section className="mt-4 mb-5">
        <h3>Rating history</h3>
        {ratingHistory.length === 0 ? (
          <div className="alert alert-light">No one has rated you yet.</div>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Score</th>
                  <th>Comment</th>
                  <th>From</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {ratingHistory.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.score > 0 ? '+1' : '-1'}</td>
                    <td>{entry.comment || '—'}</td>
                    <td>{entry.rater?.name || entry.rater?.email || 'Unknown'}</td>
                    <td>{new Date(entry.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
