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
  WAITING_BUYER_DETAILS: 'Awaiting buyer details',
  WAITING_SELLER_CONFIRM: 'Awaiting seller confirmation',
  WAITING_BUYER_RECEIPT: 'Shipped / awaiting receipt',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  // Legacy fallbacks
  PENDING_PAYMENT: 'Awaiting buyer details',
  PROCESSING: 'Shipped / awaiting receipt'
}

const STATUS_STEPS = [
  { key: 'WAITING_BUYER_DETAILS', label: 'Buyer submits invoice' },
  { key: 'WAITING_SELLER_CONFIRM', label: 'Seller confirms payment & shipping' },
  { key: 'WAITING_BUYER_RECEIPT', label: 'Buyer confirms receipt' },
  { key: 'COMPLETED', label: 'Rate each other' }
]

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
  const [invoiceForm, setInvoiceForm] = useState({ shippingAddress: '', invoiceNote: '' })
  const [shippingCode, setShippingCode] = useState('')
  const [workflowSubmitting, setWorkflowSubmitting] = useState(false)
  const order = detail?.order || null
  const messages = detail?.messages || []
  const product = detail?.product || null
  const isSeller = order && String(user?.id) === String(order.sellerId)
  const isWinner = order && String(user?.id) === String(order.winnerId)
  const normalizedStatus = useMemo(() => {
    if (!order?.status) return null
    if (order.status === 'PENDING_PAYMENT') return 'WAITING_BUYER_DETAILS'
    if (order.status === 'PROCESSING') return 'WAITING_BUYER_RECEIPT'
    return order.status
  }, [order?.status])
  const canSubmitInvoice = isWinner && normalizedStatus === 'WAITING_BUYER_DETAILS' && order?.status !== 'CANCELLED'
  const canSellerConfirm = isSeller && normalizedStatus === 'WAITING_SELLER_CONFIRM' && order?.status !== 'CANCELLED'
  const canConfirmReceipt = isWinner && normalizedStatus === 'WAITING_BUYER_RECEIPT' && order?.status !== 'CANCELLED'
  const canCancel = (isSeller || isWinner) && order?.status !== 'CANCELLED' && order?.status !== 'COMPLETED'
  const canSendMessage = order?.status !== 'CANCELLED'
  const canRate = Boolean(order) && (isSeller || isWinner) && normalizedStatus === 'COMPLETED'

  const statusColor = useMemo(() => {
    if (!order) return 'secondary'
    if (normalizedStatus === 'COMPLETED') return 'success'
    if (order.status === 'CANCELLED') return 'secondary'
    return 'warning'
  }, [order, normalizedStatus])

  const timeline = useMemo(() => {
    const currentIndex = order ? STATUS_STEPS.findIndex((step) => step.key === normalizedStatus) : -1
    return STATUS_STEPS.map((step, index) => ({
      status: step.key,
      label: step.label,
      reached:
        (order && currentIndex >= index) || (step.key === 'COMPLETED' && order?.status === 'COMPLETED')
    }))
  }, [order, normalizedStatus])

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

  useEffect(() => {
    if (!order) return
    setInvoiceForm({
      shippingAddress: order.shippingAddress || '',
      invoiceNote: order.buyerInvoiceNote || ''
    })
    setShippingCode(order.shippingCode || '')
  }, [order])

  if (!isAuthenticated) {
    return <div className="alert alert-warning">Please log in to view order details.</div>
  }

  if (loading) return <div className="alert alert-info">Loading order...</div>
  if (error) return <div className="alert alert-danger">{error}</div>
  if (!detail) return <div className="alert alert-warning">Order not found.</div>

  const handleSubmitInvoice = (event) => {
    event.preventDefault()
    if (!canSubmitInvoice) return
    setWorkflowSubmitting(true)
    setStatusStatus(null)
    updateOrderStatus(orderId, {
      status: 'WAITING_SELLER_CONFIRM',
      shippingAddress: invoiceForm.shippingAddress,
      invoiceNote: invoiceForm.invoiceNote
    })
      .then(() => {
        setStatusStatus({ type: 'success', message: 'Invoice details submitted' })
        loadDetail()
      })
      .catch((err) => {
        setStatusStatus({ type: 'danger', message: err.message || 'Unable to submit details' })
      })
      .finally(() => setWorkflowSubmitting(false))
  }

  const handleSellerConfirm = (event) => {
    event.preventDefault()
    if (!canSellerConfirm) return
    setWorkflowSubmitting(true)
    setStatusStatus(null)
    updateOrderStatus(orderId, {
      status: 'WAITING_BUYER_RECEIPT',
      shippingCode
    })
      .then(() => {
        setStatusStatus({ type: 'success', message: 'Shipping confirmed' })
        loadDetail()
      })
      .catch((err) => {
        setStatusStatus({ type: 'danger', message: err.message || 'Unable to confirm shipping' })
      })
      .finally(() => setWorkflowSubmitting(false))
  }

  const handleConfirmReceipt = () => {
    if (!canConfirmReceipt) return
    setWorkflowSubmitting(true)
    setStatusStatus(null)
    updateOrderStatus(orderId, { status: 'COMPLETED' })
      .then(() => {
        setStatusStatus({ type: 'success', message: 'Receipt confirmed' })
        loadDetail()
      })
      .catch((err) => {
        setStatusStatus({ type: 'danger', message: err.message || 'Unable to confirm receipt' })
      })
      .finally(() => setWorkflowSubmitting(false))
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
        <span className={`badge text-bg-${statusColor}`}>
          {STATUS_LABELS[normalizedStatus] || STATUS_LABELS[order.status] || order.status}
        </span>
      </div>
      <p className="text-muted">
        Product: <strong>{product?.name}</strong> | Final price: {formatVND(order.finalPrice)}
      </p>
      <p className="text-muted">
        You are the {isSeller ? 'seller' : 'winner'} | Created {formatVNTime(order.createdAt)}
      </p>

      <div className="d-flex flex-wrap align-items-center gap-3 mb-4">
        {timeline.map(({ status, label, reached }, index) => (
          <div key={status} className="d-flex align-items-center gap-2">
            <span className={`badge ${reached ? 'text-bg-success' : 'text-bg-light border'}`}>
              {label}
            </span>
            {index < timeline.length - 1 && <span className="text-muted">&rarr;</span>}
          </div>
        ))}
      </div>

      {statusStatus && <div className={`alert alert-${statusStatus.type}`}>{statusStatus.message}</div>}

      <section className="mb-4">
        <h3 className="mb-3">Fulfillment steps</h3>

        <div className="row g-3">
          <div className="col-lg-6">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <h5 className="card-title">Step 1: Buyer invoice</h5>
                <p className="text-muted small mb-3">
                  Provide shipping address and any invoice note so the seller can confirm payment.
                </p>
                {canSubmitInvoice ? (
                  <form onSubmit={handleSubmitInvoice} className="d-flex flex-column gap-3">
                    <div>
                      <label className="form-label">Shipping address</label>
                      <textarea
                        className="form-control"
                        rows="3"
                        value={invoiceForm.shippingAddress}
                        onChange={(event) =>
                          setInvoiceForm((prev) => ({ ...prev, shippingAddress: event.target.value }))
                        }
                        required
                        disabled={workflowSubmitting}
                      />
                    </div>
                    <div>
                      <label className="form-label">Invoice note (optional)</label>
                      <textarea
                        className="form-control"
                        rows="2"
                        value={invoiceForm.invoiceNote}
                        onChange={(event) =>
                          setInvoiceForm((prev) => ({ ...prev, invoiceNote: event.target.value }))
                        }
                        disabled={workflowSubmitting}
                      />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={workflowSubmitting}>
                      {workflowSubmitting ? 'Submitting...' : 'Submit details'}
                    </button>
                  </form>
                ) : (
                  <div className="alert alert-light border">
                    <p className="mb-1">
                      <strong>Address:</strong> {order.shippingAddress || 'Not provided yet'}
                    </p>
                    {order.buyerInvoiceNote && (
                      <p className="mb-0">
                        <strong>Note:</strong> {order.buyerInvoiceNote}
                      </p>
                    )}
                    {order.invoiceSubmittedAt && (
                      <small className="text-muted d-block mt-2">
                        Submitted {formatVNTime(order.invoiceSubmittedAt)}
                      </small>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="col-lg-6">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <h5 className="card-title">Step 2: Seller confirmation</h5>
                <p className="text-muted small mb-3">
                  Confirm payment and provide a shipping / tracking code for the buyer.
                </p>
                {canSellerConfirm ? (
                  <form onSubmit={handleSellerConfirm} className="d-flex flex-column gap-3">
                    <div>
                      <label className="form-label">Shipping / tracking code</label>
                      <input
                        type="text"
                        className="form-control"
                        value={shippingCode}
                        onChange={(event) => setShippingCode(event.target.value)}
                        required
                        disabled={workflowSubmitting}
                      />
                    </div>
                    <button type="submit" className="btn btn-outline-primary" disabled={workflowSubmitting}>
                      {workflowSubmitting ? 'Saving...' : 'Confirm payment & ship'}
                    </button>
                  </form>
                ) : (
                  <div className="alert alert-light border">
                    <p className="mb-1">
                      <strong>Shipping code:</strong> {order.shippingCode || 'Not provided yet'}
                    </p>
                    {order.paymentConfirmedAt && (
                      <small className="text-muted d-block mt-2">
                        Payment confirmed {formatVNTime(order.paymentConfirmedAt)}
                      </small>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="d-flex flex-wrap gap-3 align-items-center mt-3">
          {canConfirmReceipt && (
            <button className="btn btn-success" onClick={handleConfirmReceipt} disabled={workflowSubmitting}>
              {workflowSubmitting ? 'Confirming...' : 'Step 3: Confirm received'}
            </button>
          )}
          {canCancel && (
            <button className="btn btn-outline-danger" onClick={handleCancel}>
              Cancel order
            </button>
          )}
        </div>
      </section>

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
