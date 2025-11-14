import { Link } from 'react-router-dom'
import { formatVND, formatVNTime } from '../utils/format'

const PLACEHOLDER_IMAGE = 'https://placehold.co/600x400?text=Auction'

export default function ProductCard({ product, compact = false, showEndsAt = true }) {
  if (!product) return null

  const imageSrc = product.primaryImageUrl || PLACEHOLDER_IMAGE

  return (
    <div className={`card h-100 shadow-sm position-relative ${compact ? 'product-card-compact' : ''}`}>
      <div className="position-relative">
        <img src={imageSrc} alt={product.name} className="card-img-top product-card-image" />
        {product.isNew && (
          <span className="badge bg-success position-absolute top-0 start-0 m-2">New</span>
        )}
        {product.enableAutoBid && (
          <span className="badge bg-info text-dark position-absolute top-0 end-0 m-2">
            Auto-bid
          </span>
        )}
      </div>

      <div className="card-body d-flex flex-column">
        <h5 className="card-title">
          <Link to={`/products/${product.id}`} className="stretched-link text-decoration-none text-dark">
            {product.name}
          </Link>
        </h5>
        <p className="card-text text-muted mb-1">
          Current price: <strong>{formatVND(product.currentPrice)}</strong>
        </p>
        <p className="card-text text-muted mb-1">Bids: {product.bidCount}</p>
        {showEndsAt && (
          <p className="card-text small text-muted mt-auto">
            Ends at: {formatVNTime(product.endAt)}
          </p>
        )}
      </div>
    </div>
  )
}
