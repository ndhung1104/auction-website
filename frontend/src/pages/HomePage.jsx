import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchHomepageSections } from '../services/homepage'
import ProductCard from '../components/ProductCard'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination, Scrollbar } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import 'swiper/css/scrollbar'

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

  const renderSection = (title, items, fallbackLink = '/products') => {
    const slides = (items || []).slice(0, 5)
    return (
    <section className="mb-5" key={title}>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h2 className="h3 fw-bold text-dark mb-0">{title}</h2>
        <Link to={fallbackLink} className="text-primary fw-bold text-decoration-none">
          View All
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
      {!loading && slides.length > 0 && (
        <Swiper
          modules={[Navigation, Pagination, Scrollbar]}
          spaceBetween={16}
          navigation
          pagination={{ clickable: true }}
          scrollbar={{ draggable: true }}
          breakpoints={{
            0: { slidesPerView: 1.1 },
            576: { slidesPerView: 2 },
            768: { slidesPerView: 2.5 },
            992: { slidesPerView: 3 },
            1200: { slidesPerView: 3 }
          }}
        >
          {slides.map((product) => (
            <SwiperSlide key={product.id} style={{ height: 'auto' }}>
              <div className="h-100">
                <ProductCard product={product} compact />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      )}
    </section>
  )
  }

  return (
    <div>
      <div className="hero-section rounded-3 p-5 mb-5 text-center text-lg-start d-flex flex-column flex-lg-row align-items-center justify-content-between gap-4">
        <div className="py-lg-4" style={{ maxWidth: '600px' }}>
          <h1 className="display-4 fw-bold mb-3">Discover Rare Treasures at Auction</h1>
          <p className="lead mb-4 opacity-75">
            Join thousands of collectors bidding on unique items from around the world. From luxury watches to fine art, find your next prized possession.
          </p>
          <div className="d-flex gap-3 justify-content-center justify-content-lg-start">
            <Link to="/products" className="btn btn-light text-primary fw-bold px-4 py-2">
              Start Bidding
            </Link>
            <Link to="/sell/create" className="btn btn-outline-light fw-bold px-4 py-2">
              Sell an Item
            </Link>
          </div>
        </div>
        {/* Optional: Add a hero image here if available, or keep it clean as per image 0 which has a gradient/solid background */}
      </div>

      <div className="px-0">
        {error && <div className="alert alert-danger mt-4 mx-auto">{error}</div>}

        {renderSection('Top Auctions', sections.topPrice)}
        {renderSection('Ending Soon', sections.endingSoon)}
        {renderSection('Most Bidded', sections.mostBidded)}
      </div>
    </div>
  )
}
