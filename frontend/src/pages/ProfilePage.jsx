import { useEffect, useState } from 'react'
import { fetchProfile, requestSellerUpgrade, updateProfile } from '../services/profile'
import { useAuth } from '../contexts/AuthContext'

export default function ProfilePage() {
  const { user, setUser } = useAuth()
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({ fullName: '', phoneNumber: '', address: '' })
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const [alert, setAlert] = useState(null)

  useEffect(() => {
    let isMounted = true
    setLoading(true)
    fetchProfile()
      .then((response) => {
        if (!isMounted) return
        const data = response.data || {}
        setProfile(data)
        setForm({
          fullName: data.user?.fullName || '',
          phoneNumber: data.user?.phoneNumber || '',
          address: data.user?.address || ''
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

  const handleSubmit = async (event) => {
    event.preventDefault()
    setUpdating(true)
    setAlert(null)
    try {
      const response = await updateProfile(form)
      const updatedUser = response?.data?.user
      setProfile((prev) => (prev ? { ...prev, user: updatedUser } : prev))
      if (updatedUser) {
        setUser((prev) => ({ ...(prev || {}), fullName: updatedUser.fullName }))
      }
      setAlert({ type: 'success', message: 'Profile updated successfully' })
    } catch (error) {
      setAlert({
        type: 'danger',
        message: error.message || 'Unable to update profile'
      })
    } finally {
      setUpdating(false)
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

  const renderProductList = (items, emptyLabel) => {
    if (!items.length) {
      return <div className="alert alert-light mb-0">{emptyLabel}</div>
    }
    return (
      <div className="table-responsive">
        <table className="table table-sm">
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Price</th>
              <th>Ends</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.status}</td>
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
        <div className="col-lg-5">
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
              <div className="mb-3">
                <strong>Rating:</strong>{' '}
                <span className="badge bg-success me-2">+{rating?.positive || 0}</span>
                <span className="badge bg-danger">-{rating?.negative || 0}</span>
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
        </div>
        <div className="col-lg-7">
          <div className="card shadow-sm">
            <div className="card-body">
              <h3 className="card-title mb-3">Edit profile</h3>
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
                    className="form-control"
                    value={form.fullName}
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
                    className="form-control"
                    value={form.phoneNumber}
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
        {renderProductList(activeBids, 'You have no active bids.')}
      </section>
      <section className="mt-4 mb-5">
        <h3>Won auctions</h3>
        {renderProductList(wonAuctions, 'You have not won any auctions yet.')}
      </section>
    </div>
  )
}
