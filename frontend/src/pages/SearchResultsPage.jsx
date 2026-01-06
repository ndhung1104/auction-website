import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { searchProducts } from '../services/search'
import { fetchCategories } from '../services/categories'
import { addToWatchlist, removeFromWatchlist } from '../services/products'
import ProductCard from '../components/ProductCard'
import { useAuth } from '../contexts/AuthContext'

const DEFAULT_META = { total: 0, page: 1, limit: 12, hasMore: false }
const SORT_OPTIONS = [
  { value: 'end_at,asc', label: 'Ending soon' },
  { value: 'end_at,desc', label: 'Newly listed' },
  { value: 'price,asc', label: 'Price: low to high' },
  { value: 'price,desc', label: 'Price: high to low' },
  { value: 'bid_count,desc', label: 'Most bids' }
]

export default function SearchResultsPage() {
  const { isAuthenticated } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [meta, setMeta] = useState(DEFAULT_META)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchErrors, setSearchErrors] = useState({})
  const term = (searchParams.get('q') || '').trim()
  const page = Number(searchParams.get('page') || 1)
  const sort = searchParams.get('sort') || SORT_OPTIONS[0].value
  const categoryId = searchParams.get('categoryId') || ''
  const [formTerm, setFormTerm] = useState(term)
  const [categoryTree, setCategoryTree] = useState([])
  const [watchlistLoading, setWatchlistLoading] = useState({})
  const [watchlistStatus, setWatchlistStatus] = useState({})
  const watchlistTimers = useRef({})

  useEffect(() => {
    setFormTerm(term)
  }, [term])

  useEffect(() => {
    fetchCategories()
      .then((response) => {
        setCategoryTree(response?.data?.categories || [])
      })
      .catch(() => setCategoryTree([]))
  }, [])

  const flattenedCategories = useMemo(() => {
    const result = []
    const walk = (nodes = [], prefix = '') => {
      nodes.forEach((node) => {
        result.push({ id: node.id, name: `${prefix}${node.name}` })
        if (node.children?.length) {
          walk(node.children, `${prefix}› `)
        }
      })
    }
    walk(categoryTree)
    return result
  }, [categoryTree])

  useEffect(() => {
    if (!term) {
      setItems([])
      setMeta({ ...DEFAULT_META, page: 1 })
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    searchProducts(term, { page, sort, categoryId: categoryId || undefined })
      .then((response) => {
        const payload = response?.data || {}
        setItems(
          (payload.items || []).map((item) => ({
            ...item,
            isWatchlisted: Boolean(item.isWatchlisted)
          }))
        )
        setCategories(payload.categories || [])
        setMeta({
          ...DEFAULT_META,
          ...(payload.meta || {}),
          page: payload.meta?.page || page
        })
      })
      .catch((err) => {
        setItems([])
        setMeta({ ...DEFAULT_META, page })
        setCategories([])
        setError(err.message || 'Unable to search products')
      })
      .finally(() => setLoading(false))
  }, [term, page, sort, categoryId])

  const handleSubmit = (event) => {
    event.preventDefault()
    const trimmed = formTerm.trim()
    if (!trimmed) {
      setSearchErrors({})
      setSearchParams({})
      return
    }
    if (trimmed.length < 2) {
      setSearchErrors({ q: 'Enter at least 2 characters.' })
      return
    }
    setSearchErrors({})
    const params = { q: trimmed, page: '1' }
    if (sort) params.sort = sort
    if (categoryId) params.categoryId = categoryId
    setSearchParams(params)
  }

  const handlePageChange = (nextPage) => {
    if (!term) return
    const params = { q: term, page: String(nextPage) }
    if (sort) params.sort = sort
    if (categoryId) params.categoryId = categoryId
    setSearchParams(params)
  }

  const handleSortChange = (event) => {
    const nextSort = event.target.value
    const params = { q: term, page: '1' }
    if (nextSort) params.sort = nextSort
    if (categoryId) params.categoryId = categoryId
    setSearchParams(params)
  }

  const handleCategoryChange = (event) => {
    const nextCat = event.target.value
    const params = { q: term, page: '1' }
    if (sort) params.sort = sort
    if (nextCat) params.categoryId = nextCat
    setSearchParams(params)
  }

  const setStatusWithTimeout = (productId, payload) => {
    setWatchlistStatus((prev) => ({ ...prev, [productId]: payload }))
    if (watchlistTimers.current[productId]) {
      clearTimeout(watchlistTimers.current[productId])
    }
    watchlistTimers.current[productId] = setTimeout(() => {
      setWatchlistStatus((prev) => {
        const next = { ...prev }
        delete next[productId]
        return next
      })
      delete watchlistTimers.current[productId]
    }, 5000)
  }

  useEffect(() => {
    return () => {
      Object.values(watchlistTimers.current || {}).forEach((timer) => clearTimeout(timer))
      watchlistTimers.current = {}
    }
  }, [])

  const handleWatchlistToggle = async (productId, isWatchlisted) => {
    if (!isAuthenticated) return
    setWatchlistLoading((prev) => ({ ...prev, [productId]: true }))
    setStatusWithTimeout(productId, null)
    try {
      if (isWatchlisted) {
        await removeFromWatchlist(productId)
        setStatusWithTimeout(productId, { type: 'success', message: 'Removed from watchlist' })
      } else {
        await addToWatchlist(productId)
        setStatusWithTimeout(productId, { type: 'success', message: 'Added to watchlist' })
      }
      setItems((prev) =>
        prev.map((item) => (item.id === productId ? { ...item, isWatchlisted: !isWatchlisted } : item))
      )
    } catch (err) {
      setStatusWithTimeout(productId, { type: 'danger', message: err.message || 'Unable to update watchlist' })
    } finally {
      setWatchlistLoading((prev) => ({ ...prev, [productId]: false }))
    }
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
      <form className="row g-3 mb-4" onSubmit={handleSubmit} noValidate>
        <div className="col-12 col-md-6">
          <div className="input-group">
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
          </div>
          {searchErrors.q && <div className="text-danger small mt-1">{searchErrors.q}</div>}
        </div>
        <div className="col-12 col-md-3">
          <select className="form-select" value={categoryId} onChange={handleCategoryChange}>
            <option value="">All categories</option>
            {flattenedCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
        <div className="col-12 col-md-3">
          <select className="form-select" value={sort} onChange={handleSortChange}>
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
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
            <div className="d-flex flex-column h-100 gap-2">
              <ProductCard product={product} compact />
              {isAuthenticated && (
                <div className="d-flex align-items-center justify-content-between">
                  <button
                    type="button"
                    className={`btn btn-sm ${product.isWatchlisted ? 'btn-outline-danger' : 'btn-outline-primary'}`}
                    onClick={() => handleWatchlistToggle(product.id, product.isWatchlisted)}
                    disabled={Boolean(watchlistLoading[product.id])}
                  >
                    {watchlistLoading[product.id]
                      ? 'Updating...'
                      : product.isWatchlisted
                        ? 'Remove from watchlist'
                        : 'Add to watchlist'}
                  </button>
                </div>
              )}
              {watchlistStatus[product.id] && (
                <div className={`alert alert-${watchlistStatus[product.id].type} mb-0 py-2 small`}>
                  {watchlistStatus[product.id].message}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {categories.length > 0 && (
        <div className="mt-4">
          <h4 className="mb-3">Matching categories</h4>
          <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3">
            {categories.map((cat) => (
              <div className="col" key={cat.id}>
                <div className="card shadow-sm">
                  <div className="card-body">
                    <h6 className="fw-semibold mb-2">
                      <Link to={`/products?categoryId=${cat.id}`} className="text-decoration-none">
                        {cat.name}
                      </Link>
                    </h6>
                    {cat.parentId && <span className="badge bg-light text-muted">Subcategory</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
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
