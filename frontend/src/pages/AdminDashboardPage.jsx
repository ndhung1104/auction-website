import { useEffect, useState } from 'react'
import {
  approveSellerRequest,
  createCategory,
  deleteCategory,
  fetchAdminDashboard,
  fetchProductAutoBids,
  rejectSellerRequest,
  softDeleteProduct,
  updateCategory,
  updateUser,
  deleteUser,
  resetUserPassword,
  finalizeAuctions,
  updateExtendSettings
} from '../services/admin'
import { useAuth } from '../contexts/AuthContext'

export default function AdminDashboardPage() {
  const { user } = useAuth()
  const [data, setData] = useState({
    categories: [],
    products: [],
    users: [],
    sellerRequests: [],
    settings: { extendWindowMinutes: 5, extendAmountMinutes: 10 }
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [categoryForm, setCategoryForm] = useState({ name: '', parentId: '' })
  const [categoryErrors, setCategoryErrors] = useState({})
  const [extendForm, setExtendForm] = useState({ windowMinutes: 5, extendMinutes: 10 })
  const [extendErrors, setExtendErrors] = useState({})
  const [autoBids, setAutoBids] = useState([])
  const [autoBidProductId, setAutoBidProductId] = useState(null)
  const [notice, setNotice] = useState(null)
  const [confirmDialog, setConfirmDialog] = useState(null)
  const [confirmLoading, setConfirmLoading] = useState(false)
  // const [confirmDialog, setConfirmDialog] = useState(null)
  // const [confirmLoading, setConfirmLoading] = useState(false)

  const loadDashboard = () => {
    setLoading(true)
    fetchAdminDashboard()
      .then((response) => {
        const payload = response.data || {}
        setData(payload)
        if (payload.settings) {
          setExtendForm({
            windowMinutes: payload.settings.extendWindowMinutes,
            extendMinutes: payload.settings.extendAmountMinutes
          })
        }
        setError(null)
        setNotice(null)
      })
      .catch((err) => setError(err.message || 'Unable to load admin dashboard'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  if (!user || user.role !== 'ADMIN') {
    return <div className="alert alert-danger">You must be an admin to view this page.</div>
  }

  const handleCategorySubmit = (event) => {
    event.preventDefault()
    const nextErrors = {}
    if (!categoryForm.name.trim()) {
      nextErrors.name = 'Category name is required.'
    }
    if (categoryForm.parentId && Number(categoryForm.parentId) < 1) {
      nextErrors.parentId = 'Parent ID must be a positive number.'
    }
    if (Object.keys(nextErrors).length > 0) {
      setCategoryErrors(nextErrors)
      return
    }
    setCategoryErrors({})
    const payload = {
      name: categoryForm.name,
      parentId: categoryForm.parentId ? Number(categoryForm.parentId) : null
    }
    createCategory(payload)
      .then(() => {
        setCategoryForm({ name: '', parentId: '' })
        loadDashboard()
      })
      .catch((err) => setError(err.message || 'Unable to create category'))
  }

  const handleCategoryUpdate = (category) => {
    const nextName = prompt('New category name', category.name)
    if (!nextName) return
    updateCategory(category.id, { name: nextName, parentId: category.parent_id })
      .then(loadDashboard)
      .catch((err) => setError(err.message || 'Unable to update category'))
  }

  const handleCategoryDelete = (categoryId) => {
    setConfirmDialog({
      title: 'Delete category',
      message: 'Are you sure you want to delete this category? This cannot be undone.',
      action: async () => {
        await deleteCategory(categoryId)
        loadDashboard()
      }
    })
  }

  const handleUserRoleChange = (userId, nextRole) => {
    updateUser(userId, { role: nextRole })
      .then(loadDashboard)
      .catch((err) => setError(err.message || 'Unable to update user'))
  }

  const handleUserDelete = (id) => {
    setConfirmDialog({
      title: 'Suspend user',
      message: 'This will suspend the user and clear active sessions/auto-bids. Continue?',
      action: async () => {
        await deleteUser(id)
        loadDashboard()
      }
    })
  }

  const handleResetUserPassword = (id, email) => {
    setConfirmDialog({
      title: 'Reset password',
      message: `Send a new password to ${email}?`,
      action: async () => {
        await resetUserPassword(id)
        setNotice({ type: 'success', message: 'Password reset email sent.' })
      }
    })
  }

  const handleSellerRequest = (requestId, action) => {
    const fn = action === 'approve' ? approveSellerRequest : rejectSellerRequest
    fn(requestId)
      .then(loadDashboard)
      .catch((err) => setError(err.message || 'Unable to update seller request'))
  }

  const handleExtendSubmit = (event) => {
    event.preventDefault()
    const nextErrors = {}
    const windowValue = Number(extendForm.windowMinutes)
    const extendValue = Number(extendForm.extendMinutes)
    if (!extendForm.windowMinutes || Number.isNaN(windowValue) || windowValue < 1) {
      nextErrors.windowMinutes = 'Extend window must be at least 1.'
    }
    if (!extendForm.extendMinutes || Number.isNaN(extendValue) || extendValue < 1) {
      nextErrors.extendMinutes = 'Extend amount must be at least 1.'
    }
    if (Object.keys(nextErrors).length > 0) {
      setExtendErrors(nextErrors)
      return
    }
    setExtendErrors({})
    updateExtendSettings({
      windowMinutes: windowValue,
      extendMinutes: extendValue
    })
      .then(() => {
        setError(null)
        loadDashboard()
      })
      .catch((err) => setError(err.message || 'Unable to update extend settings'))
  }

  const handleSoftDeleteProduct = (productId) => {
    setConfirmDialog({
      title: 'Remove product',
      message: 'Remove this product from listings?',
      action: async () => {
        await softDeleteProduct(productId)
        loadDashboard()
      }
    })
  }

  const handleViewAutoBids = (productId) => {
    fetchProductAutoBids(productId)
      .then((response) => {
        setAutoBids(response.data?.autoBids || [])
        setAutoBidProductId(productId)
      })
      .catch((err) => setError(err.message || 'Unable to load auto-bids'))
  }

  const handleFinalizeAuctions = () => {
    setConfirmDialog({
      title: 'Finalize expired auctions',
      message: 'This will close all ended auctions, create orders for winners, and notify sellers. Proceed?',
      action: async () => {
        await finalizeAuctions()
        loadDashboard()
      }
    })
  }

  const closeConfirmDialog = () => {
    setConfirmDialog(null)
    setConfirmLoading(false)
  }

  const handleConfirm = async () => {
    if (!confirmDialog?.action) return
    setConfirmLoading(true)
    try {
      await confirmDialog.action()
      closeConfirmDialog()
    } catch (err) {
      setError(err.message || 'Action failed')
      closeConfirmDialog()
    }
  }

  return (
    <div className="admin-dashboard">
      <h1 className="mb-4">BidMaster Admin Dashboard</h1>
      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}
      {notice && (
        <div className={`alert alert-${notice.type}`}>
          {notice.message}
        </div>
      )}
      {confirmDialog && (
        <>
          <div className="modal fade show d-block" tabIndex="-1">
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">{confirmDialog.title}</h5>
                  <button type="button" className="btn-close" onClick={closeConfirmDialog} />
                </div>
                <div className="modal-body">
                  <p className="mb-0">{confirmDialog.message}</p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={closeConfirmDialog} disabled={confirmLoading}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-danger" onClick={handleConfirm} disabled={confirmLoading}>
                    {confirmLoading ? 'Processing...' : 'Confirm'}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
        </>
      )}

      <section className="mb-5">
        <h2>Auto-extend settings</h2>
        <form className="row g-3 align-items-end" onSubmit={handleExtendSubmit} noValidate>
          <div className="col-sm-4 col-md-3">
            <label className="form-label">Extend window (minutes)</label>
            <input
              type="number"
              className="form-control"
              value={extendForm.windowMinutes}
              onChange={(e) => setExtendForm((prev) => ({ ...prev, windowMinutes: e.target.value }))}
            />
            {extendErrors.windowMinutes && <div className="text-danger small mt-1">{extendErrors.windowMinutes}</div>}
          </div>
          <div className="col-sm-4 col-md-3">
            <label className="form-label">Extend amount (minutes)</label>
            <input
              type="number"
              className="form-control"
              value={extendForm.extendMinutes}
              onChange={(e) => setExtendForm((prev) => ({ ...prev, extendMinutes: e.target.value }))}
            />
            {extendErrors.extendMinutes && <div className="text-danger small mt-1">{extendErrors.extendMinutes}</div>}
          </div>
          <div className="col-sm-4 col-md-3 d-grid">
            <button type="submit" className="btn btn-primary">
              Save settings
            </button>
          </div>
          <div className="col-12 col-md-3 text-muted small">
            Current: {data.settings?.extendWindowMinutes}m window / {data.settings?.extendAmountMinutes}m extend
          </div>
        </form>
      </section>

      <section className="mb-5">
        <h2>Categories</h2>
        <form className="row g-2 mb-3" onSubmit={handleCategorySubmit} noValidate>
          <div className="col-md-5">
            <input
              className="form-control"
              placeholder="Category name"
              value={categoryForm.name}
              onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))}
            />
            {categoryErrors.name && <div className="text-danger small mt-1">{categoryErrors.name}</div>}
          </div>
          <div className="col-md-5">
            <input
              className="form-control"
              placeholder="Parent ID (optional)"
              type="number"
              value={categoryForm.parentId}
              onChange={(e) => setCategoryForm((prev) => ({ ...prev, parentId: e.target.value }))}
            />
            {categoryErrors.parentId && <div className="text-danger small mt-1">{categoryErrors.parentId}</div>}
          </div>
          <div className="col-md-2 d-grid">
            <button className="btn btn-primary" type="submit">
              Add
            </button>
          </div>
        </form>
        <div className="table-responsive">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Parent</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.categories?.map((category) => (
                <tr key={category.id}>
                  <td>{category.id}</td>
                  <td>{category.name}</td>
                  <td>{category.parent_id || '-'}</td>
                  <td className="text-end">
                    <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => handleCategoryUpdate(category)}>
                      Edit
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleCategoryDelete(category.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-5">
        <h2>Seller Requests</h2>
        <div className="table-responsive">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>ID</th>
                <th>User</th>
                <th>Status</th>
                <th>Requested</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.sellerRequests?.map((request) => (
                <tr key={request.id}>
                  <td>{request.id}</td>
                  <td>{request.fullName || request.email}</td>
                  <td>{request.status}</td>
                  <td>{new Date(request.requestedAt).toLocaleString()}</td>
                  <td className="text-end">
                    {request.status === 'PENDING' ? (
                      <>
                        <button className="btn btn-sm btn-success me-2" onClick={() => handleSellerRequest(request.id, 'approve')}>
                          Approve
                        </button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleSellerRequest(request.id, 'reject')}>
                          Reject
                        </button>
                      </>
                    ) : (
                      <span className="text-muted">Processed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-5">
        <h2>Users</h2>
        <div className="table-responsive">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.users?.map((item) => (
                <tr key={item.id}>
                  <td>{item.email}</td>
                  <td>
                    <select
                      className="form-select form-select-sm"
                      value={item.role}
                      onChange={(e) => handleUserRoleChange(item.id, e.target.value)}
                    >
                      <option value="BIDDER">Bidder</option>
                      <option value="SELLER">Seller</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </td>
                  <td>{item.status}</td>
                  <td className="text-end">
                    <button
                      className="btn btn-sm btn-outline-secondary me-2"
                      onClick={() => handleResetUserPassword(item.id, item.email)}
                    >
                      Reset password
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => handleUserDelete(item.id)}
                      disabled={String(item.id) === String(user.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-5">
        <h2>Products</h2>
        <div className="d-flex justify-content-end mb-3">
          <button className="btn btn-outline-primary btn-sm" onClick={handleFinalizeAuctions}>
            Finalize expired auctions
          </button>
        </div>
        <div className="table-responsive">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Current price</th>
                <th>Ends</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.products?.map((product) => (
                <tr key={product.id}>
                  <td>{product.name}</td>
                  <td>{product.status}</td>
                  <td>{product.currentPrice?.toLocaleString('vi-VN')}</td>
                  <td>{new Date(product.endAt).toLocaleString()}</td>
                  <td className="text-end">
                    <button className="btn btn-sm btn-outline-info me-2" onClick={() => handleViewAutoBids(product.id)}>
                      Auto-bids
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleSoftDeleteProduct(product.id)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {autoBidProductId && (
          <div className="card mt-3">
            <div className="card-header d-flex justify-content-between align-items-center">
              <span>Auto-bids for product #{autoBidProductId}</span>
              <button className="btn-close" onClick={() => setAutoBidProductId(null)} />
            </div>
            <div className="card-body">
              {autoBids.length === 0 ? (
                <p className="text-muted mb-0">No auto-bids registered.</p>
              ) : (
                <ul className="list-group list-group-flush">
                  {autoBids.map((item) => (
                    <li key={item.id} className="list-group-item d-flex justify-content-between">
                      <span>{item.full_name || item.email}</span>
                      <strong>{Number(item.max_bid_amount).toLocaleString('vi-VN')} ₫</strong>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
