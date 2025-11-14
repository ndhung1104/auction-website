import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchOrders } from '../services/orders'
import { useAuth } from '../contexts/AuthContext'
import { formatVND, formatVNTime } from '../utils/format'

const STATUS_LABELS = {
  PENDING_PAYMENT: 'Pending payment',
  PROCESSING: 'Processing',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled'
}

const getStatusBadgeClass = (status) => {
  if (status === 'COMPLETED') return 'text-bg-success'
  if (status === 'CANCELLED') return 'text-bg-secondary'
  return 'text-bg-warning'
}

export default function OrdersPage() {
  const { isAuthenticated } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isAuthenticated) {
      setOrders([])
      setLoading(false)
      return
    }
    let isMounted = true
    setLoading(true)
    fetchOrders()
      .then((response) => {
        if (!isMounted) return
        setOrders(response?.data?.items || [])
        setError(null)
      })
      .catch((err) => {
        if (!isMounted) return
        setError(err.message || 'Unable to load orders')
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [isAuthenticated])

  const content = useMemo(() => {
    if (!isAuthenticated) {
      return (
        <div className="alert alert-warning">
          Please log in to view your orders. <Link to="/login">Go to login</Link>
        </div>
      )
    }
    if (loading) {
      return <div className="alert alert-info">Loading orders...</div>
    }
    if (error) {
      return <div className="alert alert-danger">{error}</div>
    }
    if (!orders.length) {
      return <div className="alert alert-light">You have no orders yet.</div>
    }
    return (
      <>
        <div className="table-responsive d-none d-lg-block">
          <table className="table align-middle">
            <thead>
              <tr>
                <th>#</th>
                <th>Product</th>
                <th>Status</th>
                <th>Price</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>#{order.id}</td>
                  <td>
                    <Link to={`/orders/${order.id}`}>{order.productName}</Link>
                  </td>
                  <td>
                    <span className={`badge ${getStatusBadgeClass(order.status)}`}>
                      {STATUS_LABELS[order.status] || order.status}
                    </span>
                  </td>
                  <td>{formatVND(order.finalPrice)}</td>
                  <td>{formatVNTime(order.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="d-lg-none">
          <div className="row g-3">
            {orders.map((order) => (
              <div key={order.id} className="col-12">
                <div className="card shadow-sm">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="fw-semibold">Order #{order.id}</span>
                      <span className={`badge ${getStatusBadgeClass(order.status)}`}>
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                    </div>
                    <p className="mb-1">
                      <strong>Product:</strong>{' '}
                      <Link to={`/orders/${order.id}`}>{order.productName}</Link>
                    </p>
                    <p className="mb-1">
                      <strong>Total:</strong> {formatVND(order.finalPrice)}
                    </p>
                    <p className="text-muted mb-0">Created {formatVNTime(order.createdAt)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </>
    )
  }, [error, isAuthenticated, loading, orders])

  return (
    <div>
      <h1 className="mb-4">Orders</h1>
      {content}
    </div>
  )
}
