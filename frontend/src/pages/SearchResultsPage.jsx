import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { searchProducts } from '../services/search'
import ProductCard from '../components/ProductCard'

const DEFAULT_META = { total: 0, page: 1, limit: 12, hasMore: false }

export default function SearchResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState(DEFAULT_META)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const term = (searchParams.get('q') || '').trim()
  const page = Number(searchParams.get('page') || 1)
  const [formTerm, setFormTerm] = useState(term)

  useEffect(() => {
    setFormTerm(term)
  }, [term])

  useEffect(() => {
    if (!term) {
      setItems([])
      setMeta({ ...DEFAULT_META, page: 1 })
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    searchProducts(term, { page })
      .then((response) => {
        const payload = response?.data || {}
        setItems(payload.items || [])
        setMeta({
          ...DEFAULT_META,
          ...(payload.meta || {}),
          page: payload.meta?.page || page
        })
      })
      .catch((err) => {
        setItems([])
        setMeta({ ...DEFAULT_META, page })
        setError(err.message || 'Unable to search products')
      })
      .finally(() => setLoading(false))
  }, [term, page])

  const handleSubmit = (event) => {
    event.preventDefault()
    const trimmed = formTerm.trim()
    if (!trimmed) {
      setSearchParams({})
      return
    }
    setSearchParams({ q: trimmed, page: '1' })
  }

  const handlePageChange = (nextPage) => {
    if (!term) return
    setSearchParams({ q: term, page: String(nextPage) })
  }

  const renderSummary = useMemo(() => {
    if (!term || !meta.total) return null
    const rangeStart = (meta.page - 1) * meta.limit + 1
    const rangeEnd = Math.min(rangeStart + items.length - 1, meta.total)
    return (
      <span className="text-muted">
        Showing {rangeStart}-{rangeEnd} of {meta.total} results for <strong>{term}</strong>
      </span>
    )
  }, [items.length, meta.limit, meta.page, meta.total, term])

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
        <h1 className="mb-0">Search</h1>
        {renderSummary}
      </div>
      <form className="input-group mb-4" onSubmit={handleSubmit}>
        <input
          name="q"
          className="form-control"
          placeholder="Search products..."
          value={formTerm}
          onChange={(event) => setFormTerm(event.target.value)}
        />
        <button className="btn btn-primary" type="submit">
          Search
        </button>
      </form>
      {!term && (
        <div className="alert alert-light">Type a keyword above to explore available auctions.</div>
      )}
      {loading && <div className="alert alert-info">Searching...</div>}
      {error && <div className="alert alert-danger">{error}</div>}
      {!loading && term && !items.length && !error && (
        <div className="alert alert-light">No products match "{term}". Try another keyword.</div>
      )}
      <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
        {items.map((product) => (
          <div className="col" key={product.id}>
            <ProductCard product={product} compact />
          </div>
        ))}
      </div>
      {term && meta.total > meta.limit && (
        <div className="d-flex align-items-center justify-content-between mt-4">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1 || loading}
          >
            Previous
          </button>
          <span className="text-muted">Page {page}</span>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => handlePageChange(page + 1)}
            disabled={!meta.hasMore || loading}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

