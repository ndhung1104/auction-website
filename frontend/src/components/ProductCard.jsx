import { Link } from 'react-router-dom'
import { formatCountdown, formatVND, formatVNTime } from '../utils/format'

const PLACEHOLDER_IMAGE = 'https://placehold.co/600x400?text=Auction'
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '').replace(/\/$/, '')

const resolveImageUrl = (url) => {
  if (!url) return PLACEHOLDER_IMAGE
  const apiBase = API_BASE || ''
  if (url.startsWith('http')) {
    try {
      const parsed = new URL(url)
      if (apiBase) {
        const apiParsed = new URL(apiBase)
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

export default function ProductCard({ product, compact = false, showEndsAt = true }) {
  if (!product) return null

  const imageSrc = resolveImageUrl(product.primaryImageUrl)
  const highestBidder = product.currentBidderAlias || 'No bids yet'
  const timeLeft = formatCountdown(product.endAt)
  const postedAt = formatVNTime(product.createdAt, { year: 'numeric', month: '2-digit', day: '2-digit' })

  return (
    <div className={`card h-100 border-0 shadow-sm position-relative ${compact ? 'product-card-compact' : ''}`}>
      <div className="position-relative">
        <img src={imageSrc} alt={product.name} className="card-img-top product-card-image" />
        {product.isNew && (
          <span className="badge bg-success position-absolute top-0 start-0 m-3 shadow-sm">New</span>
        )}
        {product.enableAutoBid && (
          <span className="badge badge-auto-bid position-absolute top-0 end-0 m-3 shadow-sm">
            Auto-bid
          </span>
        )}
      </div>

      <div className="card-body d-flex flex-column">
        <h5 className="card-title mb-3">
          <Link to={`/products/${product.id}`} className="stretched-link text-decoration-none text-primary fw-bold">
            {product.name}
          </Link>
        </h5>

        <div className="mb-3">
          <p className="card-text text-secondary mb-1 small">Current price</p>
          <p className="h5 fw-bold text-dark mb-0">{formatVND(product.currentPrice)}</p>
        </div>

        <div className="d-flex justify-content-between align-items-center mb-2 small">
          <span className="text-muted">Bidder</span>
          <span className="fw-medium text-dark">{highestBidder}</span>
        </div>

        <div className="d-flex justify-content-between align-items-center mb-3 small">
          <span className="text-muted">Bids</span>
          <span className="badge bg-light text-dark border">{product.bidCount}</span>
        </div>
        <div className="d-flex justify-content-between align-items-center mb-3 small">
          <span className="text-muted">Posted</span>
          <span className="fw-medium text-dark">{postedAt}</span>
        </div>

        {product.buyNowPrice != null && (
          <div className="alert alert-light border py-2 px-3 mb-3 small">
            <span className="text-muted me-2">Buy now:</span>
            <strong className="text-success">{formatVND(product.buyNowPrice)}</strong>
          </div>
        )}

        {showEndsAt && (
          <div className="mt-auto pt-3 border-top">
            <div className="d-flex justify-content-between align-items-center small">
              <span className="text-muted">Ends in</span>
              <span className={`fw-bold ${timeLeft === 'Ended' ? 'text-danger' : 'text-primary'}`}>
                {timeLeft === 'Ended' ? 'Ended' : timeLeft}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
