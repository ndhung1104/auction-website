import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import {
  fetchProductBids,
  fetchProductDetail,
  placeManualBid,
  registerAutoBid,
  buyNowProduct,
  addToWatchlist,
  removeFromWatchlist,
  submitQuestion,
  answerQuestion,
  appendProductDescription,
  rejectBidder
} from '../services/products'
import { formatVND, formatVNTime, formatVNRelative } from '../utils/format'
import ProductCard from '../components/ProductCard'
import { useAuth } from '../contexts/AuthContext'

const PLACEHOLDER_IMAGE = 'https://placehold.co/800x600?text=Auction'
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '').replace(/\/$/, '')

const resolveImageUrl = (url) => {
  if (!url) return PLACEHOLDER_IMAGE
  const apiBase = API_BASE || ''
  if (url.startsWith('http')) {
    try {
      const parsed = new URL(url)
      if (apiBase) {
        const apiParsed = new URL(apiBase)
        // Normalize localhost port differences
        if (parsed.hostname === apiParsed.hostname && parsed.port && parsed.port !== apiParsed.port) {
          return `${apiParsed.origin}${parsed.pathname}${parsed.search}${parsed.hash}`
        }
      }
      return url
    } catch (_err) {
      return url
    }
  }
  return `${apiBase}${url.startsWith('/') ? '' : '/'}${url}`
}

export default function ProductDetailPage() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [bidHistory, setBidHistory] = useState([])
  const [bidLoading, setBidLoading] = useState(true)
  const [manualBidAmount, setManualBidAmount] = useState('')
  const [autoBidAmount, setAutoBidAmount] = useState('')
  const [manualStatus, setManualStatus] = useState(null)
  const [autoStatus, setAutoStatus] = useState(null)
  const [buyNowStatus, setBuyNowStatus] = useState(null)
  const [watchlistStatus, setWatchlistStatus] = useState(null)
  const [questionText, setQuestionText] = useState('')
  const [questionStatus, setQuestionStatus] = useState(null)
  const [answerDrafts, setAnswerDrafts] = useState({})
  const [answerStatus, setAnswerStatus] = useState(null)
  const [appendContent, setAppendContent] = useState('')
  const [appendStatus, setAppendStatus] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectStatus, setRejectStatus] = useState(null)
  const [watchlistLoading, setWatchlistLoading] = useState(false)
  const [manualSubmitting, setManualSubmitting] = useState(false)
  const [autoSubmitting, setAutoSubmitting] = useState(false)
  const [buyNowSubmitting, setBuyNowSubmitting] = useState(false)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [confirmDialog, setConfirmDialog] = useState(null)
  const watchlistTimerRef = useRef(null)
  const [redirected, setRedirected] = useState(false)

  const reloadProduct = useCallback(async () => {
    const response = await fetchProductDetail(productId)
    setDetail(response?.data || null)
    setError(null)
    return response
  }, [productId])

  const reloadBidHistory = useCallback(async () => {
    const response = await fetchProductBids(productId, { limit: 20 })
    setBidHistory(response?.data?.bids || [])
    return response
  }, [productId])

  useEffect(() => {
    let isMounted = true
    setLoading(true)
    setError(null)
    setActiveImageIndex(0)

    fetchProductDetail(productId)
      .then((response) => {
        if (!isMounted) return
        setDetail(response?.data || null)
        setError(null)
      })
      .catch((err) => {
        if (!isMounted) return
        setError(err.message || 'Unable to load product')
        setDetail(null)
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [productId])

  useEffect(() => {
    let isMounted = true
    setBidLoading(true)
    fetchProductBids(productId, { limit: 20 })
      .then((response) => {
        if (!isMounted) return
        setBidHistory(response?.data?.bids || [])
      })
      .catch(() => {
        if (!isMounted) return
        setBidHistory([])
      })
      .finally(() => {
        if (isMounted) setBidLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [productId])

  const product = detail?.product
  const watchlistInfo = detail?.watchlist || { isWatchlisted: false, count: 0 }
  const permissions = detail?.permissions || {}
  const manualMinBid = product ? product.currentPrice + product.priceStep : null
  const autoMinBid = product
    ? product.currentBidderId
      ? product.currentPrice + product.priceStep
      : product.startPrice
    : null
  const isSeller = user && detail?.seller?.id && String(user.id) === String(detail.seller.id)
  const isActive = product?.status === 'ACTIVE'
  const canInteract = isAuthenticated && user?.role === 'BIDDER' && !isSeller
  const canPlaceBid = canInteract && isActive
  const canBuyNow = canInteract && Boolean(product?.buyNowPrice) && isActive
  const canUseAutoBid = canPlaceBid
  const canSubmitQuestion = canInteract && isActive
  const canUseWatchlist = Boolean(isAuthenticated)
  const canAppendDescription = Boolean(permissions.canAppendDescription)
  const canRejectBidder = Boolean(permissions.canRejectBidder)
  const canAnswerQuestions = Boolean(permissions.canAnswerQuestions)
  const isWatchlisted = Boolean(watchlistInfo.isWatchlisted)
  const images = useMemo(() => {
    const resolvedPrimary = resolveImageUrl(product?.primaryImageUrl)
    if (!detail?.images?.length) {
      return [{ id: 'placeholder', url: resolvedPrimary }]
    }
    return detail.images.map((image) => ({
      ...image,
      url: resolveImageUrl(image.url || resolvedPrimary)
    }))
  }, [detail, product])
  const relativeEnd = formatVNRelative(product?.endAt)
  const relativeStart = formatVNRelative(product?.startAt)

  useEffect(() => {
    setActiveImageIndex(0)
  }, [product?.id])

  useEffect(() => {
    if (watchlistTimerRef.current) {
      clearTimeout(watchlistTimerRef.current)
    }
    if (!watchlistStatus) return undefined
    watchlistTimerRef.current = setTimeout(() => setWatchlistStatus(null), 5000)
    return () => {
      if (watchlistTimerRef.current) {
        clearTimeout(watchlistTimerRef.current)
      }
    }
  }, [watchlistStatus])

  useEffect(() => {
    if (!product || redirected) return
    if (product.status === 'ENDED' && detail?.orderForViewer?.id) {
      setRedirected(true)
      navigate(`/orders/${detail.orderForViewer.id}`)
    }
  }, [product, detail, redirected, navigate])

  useEffect(() => {
    if (!product) return
    setManualBidAmount(String(product.currentPrice + product.priceStep))
    const baseAuto = product.currentBidderId ? product.currentPrice + product.priceStep : product.startPrice
    setAutoBidAmount(String(baseAuto))
  }, [product])

  const refreshData = async () => {
    await Promise.allSettled([reloadProduct(), reloadBidHistory()])
  }

  const handleManualBid = async (event) => {
    event.preventDefault()
    if (!product) return
    setManualStatus(null)
    const numericAmount = Number(manualBidAmount)
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setManualStatus({ type: 'danger', message: 'Please enter a valid bid amount' })
      return
    }
    setConfirmDialog({ type: 'manual', amount: numericAmount })
  }

  const submitManualBid = async (numericAmount) => {
    if (!product) return
    setManualSubmitting(true)
    try {
      await placeManualBid(product.id, { amount: numericAmount })
      setManualStatus({ type: 'success', message: 'Bid placed successfully' })
      await refreshData()
    } catch (err) {
      setManualStatus({ type: 'danger', message: err.message || 'Unable to place bid' })
    } finally {
      setManualSubmitting(false)
    }
  }

  const handleAutoBid = async (event) => {
    event.preventDefault()
    if (!product) return
    setAutoStatus(null)
    const numericAmount = Number(autoBidAmount)
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setAutoStatus({ type: 'danger', message: 'Please enter a valid auto-bid amount' })
      return
    }
    setConfirmDialog({ type: 'auto', amount: numericAmount })
  }

  const submitAutoBid = async (numericAmount) => {
    if (!product) return
    setAutoSubmitting(true)
    try {
      await registerAutoBid(product.id, { maxBidAmount: numericAmount })
      setAutoStatus({ type: 'success', message: 'Auto-bid saved successfully' })
      await refreshData()
    } catch (err) {
      setAutoStatus({ type: 'danger', message: err.message || 'Unable to save auto-bid' })
    } finally {
      setAutoSubmitting(false)
    }
  }

  const handleBuyNow = async () => {
    if (!product) return
    setBuyNowStatus(null)
    setBuyNowSubmitting(true)
    try {
      await buyNowProduct(product.id)
      setBuyNowStatus({ type: 'success', message: 'Purchase completed successfully' })
      await refreshData()
    } catch (err) {
      setBuyNowStatus({ type: 'danger', message: err.message || 'Unable to complete purchase' })
    } finally {
      setBuyNowSubmitting(false)
    }
  }

  const handleWatchlistToggle = async () => {
    if (!product || !canUseWatchlist) return
    setWatchlistStatus(null)
    setWatchlistLoading(true)
    try {
      if (isWatchlisted) {
        await removeFromWatchlist(product.id)
        setWatchlistStatus({ type: 'success', message: 'Removed from watchlist' })
      } else {
        await addToWatchlist(product.id)
        setWatchlistStatus({ type: 'success', message: 'Added to watchlist' })
      }
      await reloadProduct()
    } catch (err) {
      setWatchlistStatus({ type: 'danger', message: err.message || 'Unable to update watchlist' })
    } finally {
      setWatchlistLoading(false)
    }
  }

  const handleSubmitQuestion = async (event) => {
    event.preventDefault()
    if (!product) return
    setQuestionStatus(null)
    try {
      await submitQuestion(product.id, { questionText })
      setQuestionText('')
      setQuestionStatus({ type: 'success', message: 'Question submitted' })
      await refreshData()
    } catch (err) {
      setQuestionStatus({ type: 'danger', message: err.message || 'Unable to submit question' })
    }
  }

  const handleAnswerSubmit = async (questionId) => {
    const text = answerDrafts[questionId]
    if (!text) {
      setAnswerStatus({ type: 'danger', message: 'Answer text is required' })
      return
    }
    setAnswerStatus(null)
    try {
      await answerQuestion(questionId, { answerText: text })
      setAnswerDrafts((prev) => ({ ...prev, [questionId]: '' }))
      setAnswerStatus({ type: 'success', message: 'Answer posted' })
      await refreshData()
    } catch (err) {
      setAnswerStatus({ type: 'danger', message: err.message || 'Unable to submit answer' })
    }
  }

  const handleAppendDescription = async (event) => {
    event.preventDefault()
    if (!product) return
    setAppendStatus(null)
    try {
      await appendProductDescription(product.id, { content: appendContent })
      setAppendContent('')
      setAppendStatus({ type: 'success', message: 'Description updated' })
      await reloadProduct()
    } catch (err) {
      setAppendStatus({ type: 'danger', message: err.message || 'Unable to append description' })
    }
  }

  const handleRejectBidder = async (event) => {
    event.preventDefault()
    if (!product?.currentBidderId) {
      setRejectStatus({ type: 'danger', message: 'No bidder to reject' })
      return
    }
    setRejectStatus(null)
    try {
      await rejectBidder(product.id, { bidderId: product.currentBidderId, reason: rejectReason })
      setRejectReason('')
      setRejectStatus({ type: 'success', message: 'Bidder removed' })
      await refreshData()
    } catch (err) {
      setRejectStatus({ type: 'danger', message: err.message || 'Unable to reject bidder' })
    }
  }

  const closeConfirmDialog = () => setConfirmDialog(null)

  const confirmAndSubmit = async () => {
    if (!confirmDialog) return
    if (confirmDialog.type === 'manual') {
      await submitManualBid(confirmDialog.amount)
    } else if (confirmDialog.type === 'auto') {
      await submitAutoBid(confirmDialog.amount)
    }
    setConfirmDialog(null)
  }

  if (loading) {
    return <div className="alert alert-info">Loading product…</div>
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>
  }

  if (!product) {
    return <div className="alert alert-warning">Product not found.</div>
  }

  return (
    <div className="product-detail-page py-4">
      {confirmDialog && (
        <>
          <div className="modal fade show d-block" tabIndex="-1">
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    {confirmDialog.type === 'manual' ? 'Confirm manual bid' : 'Confirm auto-bid'}
                  </h5>
                  <button type="button" className="btn-close" onClick={closeConfirmDialog}></button>
                </div>
                <div className="modal-body">
                  <p className="mb-1">
                    Amount: <strong>{formatVND(confirmDialog.amount)}</strong>
                  </p>
                  <small className="text-muted">Product: {product.name}</small>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={closeConfirmDialog}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={confirmAndSubmit}
                    disabled={manualSubmitting || autoSubmitting}
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
        </>
      )}
      <div className="d-flex align-items-center gap-3 mb-3 flex-wrap">
        <div className="d-flex align-items-center gap-3">
          <h1 className="h2 fw-bold text-primary mb-0">{product.name}</h1>
          {product.isNew && <span className="badge bg-success shadow-sm">New</span>}
          {product.enableAutoBid && <span className="badge badge-auto-bid">Auto-bid supported</span>}
          {!isActive && <span className="badge bg-secondary shadow-sm">Ended</span>}
        </div>
        {canUseWatchlist && (
          <button
            type={watchlistLoading ? 'button' : 'button'}
            className={`btn btn-sm ${isWatchlisted ? 'btn-outline-danger' : 'btn-outline-primary'} fw-medium`}
            onClick={handleWatchlistToggle}
            disabled={watchlistLoading}
          >
            {watchlistLoading
              ? 'Updating…'
              : isWatchlisted
                ? 'Remove from watchlist'
                : 'Add to watchlist'}
          </button>
        )}
      </div>
      {watchlistStatus && (
        <div className={`alert alert-${watchlistStatus.type} shadow-sm`}>{watchlistStatus.message}</div>
      )}
      <p className="text-secondary mb-4">
        Starts: <span className="fw-medium text-dark">{formatVNTime(product.startAt)}</span>
        {relativeStart && <span className="text-muted ms-2">({relativeStart})</span>} ·
        Ends: <span className="fw-medium text-dark">{formatVNTime(product.endAt)}</span>
        {relativeEnd && <span className="text-muted ms-2">({relativeEnd})</span>} ·
        Watchers: <span className="fw-medium text-dark">{watchlistInfo.count}</span>
      </p>

      <div className="row g-4">
        <div className="col-lg-7">
          <div className="card shadow-sm mb-3">
            <img
              src={images[activeImageIndex]?.url || PLACEHOLDER_IMAGE}
              alt={product.name}
              className="card-img-top"
            />
          </div>

          {images.length > 1 && (
            <div className="d-flex gap-2 flex-wrap">
              {images.map((image, index) => (
                <button
                  key={image.id || index}
                  type="button"
                  onClick={() => setActiveImageIndex(index)}
                  className={`btn btn-sm ${index === activeImageIndex ? 'btn-primary' : 'btn-outline-secondary'}`}
                >
                  Image {index + 1}
                </button>
              ))}
            </div>
          )}

          <div className="mt-5">
            <h4 className="h5 fw-bold text-primary border-bottom pb-2 mb-3">Description</h4>
            {product.description ? (
              <div
                className="text-secondary"
                style={{ lineHeight: '1.8' }}
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            ) : (
              <div className="text-secondary">No description provided yet.</div>
            )}
            {detail.descriptionHistory?.length ? (
              <div className="mt-3">
                <h6 className="text-muted fw-semibold">Appended updates</h6>
                <ul className="list-group list-group-flush">
                  {detail.descriptionHistory.map((entry) => (
                    <li key={entry.id} className="list-group-item px-0">
                      <div className="small text-muted mb-1">{entry.label}</div>
                      <div
                        className="text-secondary"
                        dangerouslySetInnerHTML={{ __html: entry.content }}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>

        <div className="col-lg-5">
          <div className="card shadow-sm border-0 mb-4">
                <div className="card-body p-4">
                  <h4 className="h3 fw-bold text-primary mb-3">{formatVND(product.currentPrice)}</h4>
                  <div className="d-flex flex-column gap-2 text-secondary mb-4">
                    <div className="d-flex justify-content-between">
                      <span>Start price:</span>
                      <span className="fw-medium text-dark">{formatVND(product.startPrice)}</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span>Price step:</span>
                      <span className="fw-medium text-dark">{formatVND(product.priceStep)}</span>
                    </div>
                    {product.buyNowPrice && (
                      <div className="d-flex justify-content-between">
                        <span>Buy now:</span>
                        <span className="fw-medium text-success">{formatVND(product.buyNowPrice)}</span>
                      </div>
                    )}
                    <div className="d-flex justify-content-between">
                      <span>Total bids:</span>
                      <span className="fw-medium text-dark">{product.bidCount}</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span>Status:</span>
                      <span className={`badge ${isActive ? 'bg-success' : 'bg-secondary'}`}>{product.status}</span>
                    </div>
                  </div>

                  {product.buyNowPrice && (
                    <button
                      type="button"
                      className="btn btn-dark w-100 fw-bold py-3 shadow-sm"
                      onClick={handleBuyNow}
                      disabled={!canBuyNow || buyNowSubmitting}
                    >
                      {buyNowSubmitting ? 'Processing…' : `Buy Now - ${formatVND(product.buyNowPrice)}`}
                    </button>
                  )}
                  {product.buyNowPrice && !canBuyNow && (
                    <small className="text-muted d-block mt-2 text-center">
                      {isAuthenticated ? 'You cannot buy this product now.' : 'Please login as a bidder to buy now.'}
                    </small>
                  )}
                  {buyNowStatus && (
                    <div className={`alert alert-${buyNowStatus.type} mt-3`} role="alert">
                      {buyNowStatus.message}
                    </div>
                  )}
                </div>
              </div>
          {!isSeller && (
            <>
              <div className="card shadow-sm border-0 mb-4">
                <div className="card-body p-4">
                  <h5 className="fw-bold text-dark mb-3">Manual Bid</h5>
                  {!canPlaceBid && (
                    <p className="text-muted mb-3 small">
                      {isAuthenticated
                        ? isSeller
                          ? 'Sellers cannot bid on their own products.'
                          : isActive
                            ? 'You must be a bidder to place bids.'
                            : 'Auction is no longer active.'
                        : 'Please sign in as a bidder to place bids.'}
                    </p>
                  )}
                  {manualStatus && (
                    <div className={`alert alert-${manualStatus.type} small`} role="alert">
                      {manualStatus.message}
                    </div>
                  )}
                  <form onSubmit={handleManualBid} className="mt-3">
                    <div className="mb-3">
                      <label htmlFor="manualBidAmount" className="form-label text-secondary small fw-medium">
                        Enter your bid amount
                      </label>
                      <div className="input-group">
                        <input
                          id="manualBidAmount"
                          type="number"
                          min={manualMinBid || undefined}
                          step={product.priceStep}
                          className="form-control"
                          value={manualBidAmount}
                          onChange={(event) => setManualBidAmount(event.target.value)}
                          disabled={!canPlaceBid || manualSubmitting}
                        />
                        <button type="submit" className="btn btn-primary fw-bold px-4" disabled={!canPlaceBid || manualSubmitting}>
                          {manualSubmitting ? 'Placing...' : 'Place Bid'}
                        </button>
                      </div>
                      {manualMinBid && (
                        <small className="text-muted mt-1 d-block">
                          Minimum next bid: <span className="fw-medium text-dark">{formatVND(manualMinBid)}</span>
                        </small>
                      )}
                    </div>
                  </form>
                </div>
              </div>

              {product.enableAutoBid && (
                <div className="card shadow-sm mb-3">
                  <div className="card-body">
                    <h5>Auto-bid</h5>
                    {!canUseAutoBid && (
                      <p className="text-muted mb-3">
                        {isAuthenticated
                          ? isActive
                            ? 'You cannot register auto-bid for this product.'
                            : 'Auction is no longer active.'
                          : 'Login to register automatic bidding.'}
                      </p>
                    )}
                    {autoStatus && (
                      <div className={`alert alert-${autoStatus.type}`} role="alert">
                        {autoStatus.message}
                      </div>
                    )}
                    <form onSubmit={handleAutoBid}>
                      <div className="mb-3">
                        <label htmlFor="autoBidAmount" className="form-label">
                          Maximum amount you are willing to pay
                        </label>
                        <input
                          id="autoBidAmount"
                          type="number"
                          min={autoMinBid || undefined}
                          step={product.priceStep}
                          className="form-control"
                          value={autoBidAmount}
                          onChange={(event) => setAutoBidAmount(event.target.value)}
                          disabled={!canUseAutoBid || autoSubmitting}
                        />
                        {autoMinBid && (
                          <small className="text-muted">
                            Minimum auto-bid: {formatVND(autoMinBid)}
                          </small>
                        )}
                      </div>
                      <button type="submit" className="btn btn-outline-primary w-100" disabled={!canUseAutoBid || autoSubmitting}>
                        {autoSubmitting ? 'Saving…' : 'Save auto-bid'}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              <div className="card shadow-sm">
                <div className="card-body">
                  <h5>Seller</h5>
                  <p className="mb-1">{detail.seller?.fullName || 'Unknown seller'}</p>
                  {detail.seller?.rating && (
                    <small className="text-muted d-block mb-2">
                      Rating: +{detail.seller.rating.positive} / -{detail.seller.rating.negative} (score{' '}
                      {detail.seller.rating.score})
                    </small>
                  )}
                  {detail.keeper && (
                    <>
                      <hr />
                      <h6>Current keeper</h6>
                      <p className="mb-1">{detail.keeper.fullName || 'Hidden bidder'}</p>
                      {detail.keeper.rating && (
                        <small className="text-muted d-block">
                          Rating: +{detail.keeper.rating.positive} / -{detail.keeper.rating.negative}
                        </small>
                      )}
                    </>
                  )}
                </div>
              </div>

              
            </>
          )}

          {canAppendDescription && (
            <div className="card shadow-sm mt-3">
              <div className="card-body">
                <h5>Append description</h5>
                {appendStatus && (
                  <div className={`alert alert-${appendStatus.type}`} role="alert">
                    {appendStatus.message}
                  </div>
                )}
                <form onSubmit={handleAppendDescription}>
                  <div className="mb-3">
                    <label className="form-label fw-medium">Additional details</label>
                    <ReactQuill
                      theme="snow"
                      value={appendContent}
                      onChange={setAppendContent}
                      placeholder="Add formatted updates for bidders"
                    />
                  </div>
                  <button type="submit" className="btn btn-outline-secondary btn-sm">
                    Append text
                  </button>
                </form>
              </div>
            </div>
          )}

          {canRejectBidder && (
            <div className="card shadow-sm mt-3">
              <div className="card-body">
                <h5>Reject current bidder</h5>
                {rejectStatus && (
                  <div className={`alert alert-${rejectStatus.type}`} role="alert">
                    {rejectStatus.message}
                  </div>
                )}
                <form onSubmit={handleRejectBidder}>
                  <div className="mb-2">
                    <label className="form-label" htmlFor="rejectReason">
                      Reason (optional)
                    </label>
                    <textarea
                      id="rejectReason"
                      className="form-control"
                      rows="2"
                      value={rejectReason}
                      onChange={(event) => setRejectReason(event.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn btn-outline-danger btn-sm">
                    Reject bidder
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      <section className="mt-5">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h3 className="mb-0">Bid history</h3>
          <small className="text-muted">Latest 20 entries</small>
        </div>
        {bidLoading && <div className="alert alert-info">Loading bid history…</div>}
        {!bidLoading && !bidHistory.length && <div className="alert alert-light">No bids yet.</div>}
        {!bidLoading && bidHistory.length > 0 && (
          <div className="table-responsive shadow-sm rounded-3 border">
            <table className="table table-hover mb-0 align-middle">
              <thead className="bg-light">
                <tr>
                  <th className="py-3 ps-4">Bidder</th>
                  <th className="py-3">Amount</th>
                  <th className="py-3">Type</th>
                  <th className="py-3 pe-4">Time</th>
                </tr>
              </thead>
              <tbody>
                {bidHistory.map((bid) => (
                  <tr key={bid.id}>
                    <td className="ps-4 fw-medium text-dark">{bid.bidderAlias || 'Hidden'}</td>
                    <td className="fw-bold text-primary">{formatVND(bid.amount)}</td>
                    <td>
                      <span className={`badge ${bid.isAutoBid ? 'bg-info text-white' : 'bg-secondary'}`}>
                        {bid.isAutoBid ? 'Auto bid' : 'Manual'}
                      </span>
                    </td>
                    <td className="text-secondary pe-4">{formatVNTime(bid.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-5">
        <h3>Questions & Answers</h3>
        {canSubmitQuestion && (
          <form className="card shadow-sm mb-3" onSubmit={handleSubmitQuestion}>
            <div className="card-body">
              <label htmlFor="questionText" className="form-label">
                Ask a question
              </label>
              <textarea
                id="questionText"
                className="form-control mb-2"
                rows="3"
                value={questionText}
                onChange={(event) => setQuestionText(event.target.value)}
              />
              <button type="submit" className="btn btn-outline-primary btn-sm" disabled={!questionText.trim()}>
                Submit question
              </button>
              {questionStatus && (
                <div className={`alert alert-${questionStatus.type} mt-2`} role="alert">
                  {questionStatus.message}
                </div>
              )}
            </div>
          </form>
        )}
        {answerStatus && (
          <div className={`alert alert-${answerStatus.type}`} role="alert">
            {answerStatus.message}
          </div>
        )}
        {!detail.questions?.length && <div className="alert alert-light mt-3">No questions yet.</div>}
        {detail.questions?.map((question) => (
          <div key={question.id} className="card shadow-sm mb-3">
            <div className="card-body">
              <p className="mb-1">
                <strong>Q:</strong> {question.questionText}
              </p>
              <small className="text-muted d-block">Asked at {formatVNTime(question.createdAt)}</small>
              {question.answer ? (
                <div className="mt-2">
                  <p className="mb-1">
                    <strong>A:</strong> {question.answer.answerText}
                  </p>
                  <small className="text-muted d-block">Answered at {formatVNTime(question.answer.createdAt)}</small>
                </div>
              ) : (
                <>
                  <small className="text-muted d-block mb-2">Awaiting seller response…</small>
                  {canAnswerQuestions && (
                    <div>
                      <textarea
                        className="form-control mb-2"
                        rows="2"
                        value={answerDrafts[question.id] || ''}
                        onChange={(event) =>
                          setAnswerDrafts((prev) => ({ ...prev, [question.id]: event.target.value }))
                        }
                      />
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => handleAnswerSubmit(question.id)}
                      >
                        Submit answer
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </section>

      <section className="mt-5">
        <h3>Related products</h3>
        {!detail.relatedProducts?.length && <div className="alert alert-light mt-3">No related products.</div>}
        {detail.relatedProducts?.length > 0 && (
          <div className="row g-4 mt-1">
            {detail.relatedProducts.map((related) => (
              <div className="col-12 col-sm-6 col-lg-4" key={related.id}>
                <ProductCard product={related} compact />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
