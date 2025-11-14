import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  cancelOrder,
  fetchOrderDetail,
  rateOrder,
  sendOrderMessage,
  updateOrderStatus
} from '../services/orders'
import { useAuth } from '../contexts/AuthContext'
import { formatVND, formatVNTime } from '../utils/format'

const STATUS_LABELS = {
  PENDING_PAYMENT: 'Pending payment',
  PROCESSING: 'Processing',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled'
}

const STATUS_ACTIONS = [
  { key: 'PROCESSING', label: 'Mark processing' },
  { key: 'COMPLETED', label: 'Mark completed' }
]

const STATUS_STEPS = ['PENDING_PAYMENT', 'PROCESSING', 'COMPLETED']

export default function OrderDetailPage() {
  const { orderId } = useParams()
  const { user, isAuthenticated } = useAuth()
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState('')
  const [messageStatus, setMessageStatus] = useState(null)
  const [ratingStatus, setRatingStatus] = useState(null)
  const [statusStatus, setStatusStatus] = useState(null)

  const loadDetail = useCallback(() => {
    setLoading(true)
    setError(null)
    return fetchOrderDetail(orderId)
      .then((response) => {
        setDetail(response?.data || null)
        setError(null)
      })
      .catch((err) => {
        setDetail(null)
        setError(err.message || 'Unable to load order')
      })
      .finally(() => setLoading(false))
  }, [orderId])

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }
    loadDetail()
  }, [isAuthenticated, loadDetail])

  if (!isAuthenticated) {
    return <div className="alert alert-warning">Please log in to view order details.</div>
  }

  if (loading) return <div className="alert alert-info">Loading order...</div>
  if (error) return <div className="alert alert-danger">{error}</div>
  if (!detail) return <div className="alert alert-warning">Order not found.</div>

  const { order, messages, product } = detail
  const isSeller = order && String(user?.id) === String(order.sellerId)
  const isWinner = order && String(user?.id) === String(order.winnerId)
  const canUpdateStatus = isSeller && order.status !== 'CANCELLED'
  const canCancel = canUpdateStatus && order.status !== 'COMPLETED'
  const canSendMessage = order.status !== 'CANCELLED'
  const canRate = isSeller || isWinner

  const statusColor = useMemo(() => {
    if (order.status === 'COMPLETED') return 'success'
    if (order.status === 'CANCELLED') return 'secondary'
    return 'warning'
  }, [order.status])

  const timeline = useMemo(() => {
    const currentIndex = STATUS_STEPS.indexOf(order.status)
    return STATUS_STEPS.map((status, index) => ({
      status,
      reached: currentIndex >= index
    }))
  }, [order.status])

  const handleStatusChange = (nextStatus) => {
    if (!canUpdateStatus) return
    setStatusStatus(null)
    updateOrderStatus(orderId, { status: nextStatus })
      .then(() => {
        setStatusStatus({ type: 'success', message: 'Order status updated' })
        loadDetail()
      })
      .catch((err) => {
        setStatusStatus({ type: 'danger', message: err.message || 'Unable to update status' })
      })
  }

  const handleCancel = () => {
    if (!canCancel) return
    setStatusStatus(null)
    cancelOrder(orderId)
      .then(() => {
        setStatusStatus({ type: 'success', message: 'Order cancelled' })
        loadDetail()
      })
      .catch((err) => {
        setStatusStatus({ type: 'danger', message: err.message || 'Unable to cancel order' })
      })
  }

  const handleSendMessage = (event) => {
    event.preventDefault()
    if (!message.trim()) return
    setMessageStatus(null)
    sendOrderMessage(orderId, { message })
      .then(() => {
        setMessage('')
        setMessageStatus({ type: 'success', message: 'Message sent' })
        loadDetail()
      })
      .catch((err) => {
        setMessageStatus({ type: 'danger', message: err.message || 'Unable to send message' })
      })
  }

  const handleRating = (score) => {
    if (!canRate) return
    setRatingStatus(null)
    rateOrder(orderId, { score, comment: '' })
      .then(() => {
        setRatingStatus({ type: 'success', message: 'Rating submitted' })
      })
      .catch((err) => {
        setRatingStatus({ type: 'danger', message: err.message || 'Unable to submit rating' })
      })
  }

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
        <h1 className="mb-0">Order #{order.id}</h1>
        <span className={`badge text-bg-${statusColor}`}>{STATUS_LABELS[order.status] || order.status}</span>
      </div>
      <p className="text-muted">
        Product: <strong>{product?.name}</strong> | Final price: {formatVND(order.finalPrice)}
      </p>
      <p className="text-muted">
        You are the {isSeller ? 'seller' : 'winner'} | Created {formatVNTime(order.createdAt)}
      </p>

      <div className="d-flex flex-wrap align-items-center gap-3 mb-4">
        {timeline.map(({ status, reached }, index) => (
          <div key={status} className="d-flex align-items-center gap-2">
            <span className={`badge ${reached ? 'text-bg-success' : 'text-bg-light border'}`}>
              {STATUS_LABELS[status]}
            </span>
            {index < timeline.length - 1 && <span className="text-muted">&rarr;</span>}
          </div>
        ))}
      </div>

      {statusStatus && <div className={`alert alert-${statusStatus.type}`}>{statusStatus.message}</div>}

      {canUpdateStatus && (
        <div className="btn-group mb-4">
          {STATUS_ACTIONS.map((action) => (
            <button
              key={action.key}
              className="btn btn-outline-secondary"
              onClick={() => handleStatusChange(action.key)}
              disabled={order.status === action.key}
            >
              {action.label}
            </button>
          ))}
          {canCancel && (
            <button className="btn btn-outline-danger" onClick={handleCancel}>
              Cancel order
            </button>
          )}
        </div>
      )}

      <section className="mb-5">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h3 className="mb-0">Chat</h3>
          <span className="text-muted">{messages?.length || 0} messages</span>
        </div>
        {messages?.length ? (
          <ul className="list-group mb-3">
            {messages.map((msg) => {
              const isOwn = String(msg.sender_id) === String(user?.id)
              return (
                <li key={msg.id} className={`list-group-item ${isOwn ? 'list-group-item-primary' : ''}`}>
                  <div className="d-flex justify-content-between">
                    <strong>{msg.sender_name || (isOwn ? 'You' : 'User')}</strong>
                    <small className="text-muted">{formatVNTime(msg.created_at)}</small>
                  </div>
                  <p className="mb-0 mt-1">{msg.message}</p>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="alert alert-light">No messages yet.</div>
        )}
        {messageStatus && (
          <div className={`alert alert-${messageStatus.type}`}>{messageStatus.message}</div>
        )}
        <form className="input-group" onSubmit={handleSendMessage}>
          <textarea
            className="form-control"
            rows="2"
            value={message}
            placeholder="Write a message..."
            onChange={(event) => setMessage(event.target.value)}
            disabled={!canSendMessage}
          />
          <button className="btn btn-primary" type="submit" disabled={!message.trim() || !canSendMessage}>
            Send
          </button>
        </form>
      </section>

      <section className="mb-4">
        <h3>Rating</h3>
        {ratingStatus && (
          <div className={`alert alert-${ratingStatus.type}`}>{ratingStatus.message}</div>
        )}
        <div className="btn-group">
          <button className="btn btn-outline-success" onClick={() => handleRating(1)} disabled={!canRate}>
            Positive
          </button>
          <button className="btn btn-outline-danger" onClick={() => handleRating(-1)} disabled={!canRate}>
            Negative
          </button>
        </div>
      </section>
    </div>
  )
}
