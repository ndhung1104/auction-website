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
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h2 className="mb-0">{title}</h2>
        <Link to={fallbackLink} className="text-decoration-none">
          View all →
        </Link>
      </div>
      {loading && <div className="alert alert-info">Loading {title.toLowerCase()}…</div>}
      {!loading && !items.length && (
        <div className="alert alert-light">No products available for this section.</div>
      )}
      {!loading && items.length > 0 && (
        <div className="row g-4">
          {items.map((product) => (
            <div className="col-12 col-sm-6 col-lg-4" key={product.id}>
              <ProductCard product={product} compact />
            </div>
          ))}
        </div>
      )}
    </section>
  )

  return (
    <div>
      <div className="mb-5">
        <h1 className="mb-2">Discover top auctions</h1>
        <p className="text-muted mb-0">
          Browse curated highlights: premium items, auctions ending soon, and the most competitive bidding wars.
        </p>
        {error && <div className="alert alert-danger mt-3">{error}</div>}
      </div>

      {renderSection('Top price highlights', sections.topPrice)}
      {renderSection('Ending soon', sections.endingSoon)}
      {renderSection('Most bidded items', sections.mostBidded)}
    </div>
  )
}
