import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fetchProductBids, fetchProductDetail } from '../services/products'
import { formatVND, formatVNTime } from '../utils/format'
import ProductCard from '../components/ProductCard'

const PLACEHOLDER_IMAGE = 'https://placehold.co/800x600?text=Auction'

export default function ProductDetailPage() {
  const { productId } = useParams()
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [bidHistory, setBidHistory] = useState([])
  const [bidLoading, setBidLoading] = useState(true)
  const [manualBidAmount, setManualBidAmount] = useState('')
  const [manualMessage, setManualMessage] = useState(null)
  const [activeImageIndex, setActiveImageIndex] = useState(0)

  useEffect(() => {
    let isMounted = true
    setLoading(true)
    setError(null)
    setActiveImageIndex(0)

    fetchProductDetail(productId)
      .then((response) => {
        if (!isMounted) return
        setDetail(response?.data || null)
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
  const images = useMemo(() => {
    if (!detail?.images?.length) {
      return [{ id: 'placeholder', url: product?.primaryImageUrl || PLACEHOLDER_IMAGE }]
    }
    return detail.images
  }, [detail])

  useEffect(() => {
    setActiveImageIndex(0)
  }, [product?.id])

  const handleManualBid = (event) => {
    event.preventDefault()
    setManualMessage('Manual bidding will be available in week 5. Stay tuned!')
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
    <div className="product-detail-page">
      <div className="d-flex align-items-center gap-3 mb-3">
        <h1 className="mb-0">{product.name}</h1>
        {product.isNew && <span className="badge bg-success">New</span>}
        {product.enableAutoBid && <span className="badge bg-info text-dark">Auto-bid supported</span>}
      </div>
      <p className="text-muted">Auction ends at {formatVNTime(product.endAt)}</p>

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

          <div className="mt-4">
            <h4>Description</h4>
            <p>{product.description || 'No description provided yet.'}</p>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="card shadow-sm mb-3">
            <div className="card-body">
              <h4>Current price: {formatVND(product.currentPrice)}</h4>
              <p className="mb-1">Start price: {formatVND(product.startPrice)}</p>
              <p className="mb-1">Price step: {formatVND(product.priceStep)}</p>
              {product.buyNowPrice && <p className="mb-1">Buy now: {formatVND(product.buyNowPrice)}</p>}
              <p className="mb-1">Total bids: {product.bidCount}</p>
              <p className="text-muted mb-0">Status: {product.status}</p>
            </div>
          </div>

          <div className="card shadow-sm mb-3">
            <div className="card-body">
              <h5>Manual bid (coming soon)</h5>
              <form onSubmit={handleManualBid} className="mt-3">
                <div className="mb-3">
                  <label htmlFor="manualBidAmount" className="form-label">
                    Enter your bid amount
                  </label>
                  <input
                    id="manualBidAmount"
                    type="number"
                    min={product.currentPrice + product.priceStep}
                    step={product.priceStep}
                    className="form-control"
                    value={manualBidAmount}
                    onChange={(event) => setManualBidAmount(event.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-primary w-100">
                  Place bid
                </button>
              </form>
              {manualMessage && <p className="text-muted mt-2">{manualMessage}</p>}
            </div>
          </div>

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
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Bidder</th>
                  <th>Amount</th>
                  <th>Type</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {bidHistory.map((bid) => (
                  <tr key={bid.id}>
                    <td>{bid.bidderAlias || 'Hidden'}</td>
                    <td>{formatVND(bid.amount)}</td>
                    <td>{bid.isAutoBid ? 'Auto' : 'Manual'}</td>
                    <td>{formatVNTime(bid.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-5">
        <h3>Questions & Answers</h3>
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
                <small className="text-muted">Awaiting seller response…</small>
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
