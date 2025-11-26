import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchHomepageSections } from '../services/homepage'
import ProductCard from '../components/ProductCard'

export default function HomePage() {
  const [sections, setSections] = useState({
    topPrice: [],
    endingSoon: [],
    mostBidded: []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true
    setLoading(true)
    fetchHomepageSections()
      .then((response) => {
        if (!isMounted) return
        setSections({
          topPrice: response?.data?.topPrice || [],
          endingSoon: response?.data?.endingSoon || [],
          mostBidded: response?.data?.mostBidded || []
        })
        setError(null)
      })
      .catch((err) => {
        if (!isMounted) return
        setError(err.message || 'Unable to load homepage')
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  const renderSection = (title, items, fallbackLink = '/products') => (
    <section className="mb-5" key={title}>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h2 className="h3 fw-bold text-primary mb-0">{title}</h2>
        <Link to={fallbackLink} className="btn btn-outline-primary btn-sm">
          View all
        </Link>
      </div>
      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}
      {!loading && !items.length && (
        <div className="alert alert-light border text-center py-4">
          <p className="mb-0 text-muted">No products available for this section.</p>
        </div>
      )}
      {!loading && items.length > 0 && (
        <div className="row g-4">
          {items.map((product) => (
            <div className="col-12 col-sm-6 col-lg-4 col-xl-3" key={product.id}>
              <ProductCard product={product} compact />
            </div>
          ))}
        </div>
      )}
    </section>
  )

  return (
    <div className="py-4">
      <div className="text-center mb-5 py-5 bg-surface rounded-3 shadow-sm border">
        <h1 className="display-4 fw-bold text-primary mb-3">Discover Top Auctions</h1>
        <p className="lead text-secondary mb-0 mx-auto" style={{ maxWidth: '600px' }}>
          Browse curated highlights: premium items, auctions ending soon, and the most competitive bidding wars.
        </p>
        {error && <div className="alert alert-danger mt-4 mx-auto" style={{ maxWidth: '500px' }}>{error}</div>}
      </div>

      {renderSection('Top Price Highlights', sections.topPrice)}
      {renderSection('Ending Soon', sections.endingSoon)}
      {renderSection('Most Bidded Items', sections.mostBidded)}
    </div>
  )
}
