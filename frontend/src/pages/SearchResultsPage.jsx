import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { searchProducts } from '../services/search'
import { fetchCategories } from '../services/categories'
import { addToWatchlist, removeFromWatchlist } from '../services/products'
import ProductCard from '../components/ProductCard'
import { useAuth } from '../contexts/AuthContext'

const DEFAULT_META = { total: 0, page: 1, limit: 12, hasMore: false }
const SORT_OPTIONS = [
  { value: 'created_at,desc', label: 'Newly listed' },
  { value: 'end_at,asc', label: 'Ending soon' },
  { value: 'price,asc', label: 'Price: low to high' },
  { value: 'price,desc', label: 'Price: high to low' },
  { value: 'bid_count,desc', label: 'Most bids' }
]

const LOGIC_OPTIONS = [
  { value: 'and', label: 'Match all (AND)' },
  { value: 'or', label: 'Match any (OR)' }
]

const formatDateInput = (date) => {
  const offset = date.getTimezoneOffset()
  const adjusted = new Date(date.getTime() - offset * 60 * 1000)
  return adjusted.toISOString().slice(0, 16)
}

const normalizeDateInput = (value) => {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return formatDateInput(parsed)
}

const toISOFromLocalInput = (value) => {
  if (!value) return value
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toISOString()
}

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
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [priceLogic, setPriceLogic] = useState('and')
  const [bidMin, setBidMin] = useState('')
  const [bidMax, setBidMax] = useState('')
  const [bidLogic, setBidLogic] = useState('and')
  const [allowUnrated, setAllowUnrated] = useState('')
  const [allowUnratedLogic, setAllowUnratedLogic] = useState('and')
  const [startAtFrom, setStartAtFrom] = useState('')
  const [startAtTo, setStartAtTo] = useState('')
  const [startAtLogic, setStartAtLogic] = useState('and')
  const [endAtFrom, setEndAtFrom] = useState('')
  const [endAtTo, setEndAtTo] = useState('')
  const [endAtLogic, setEndAtLogic] = useState('and')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const searchKey = searchParams.toString()

  useEffect(() => {
    setFormTerm(term)
    setPriceMin(searchParams.get('priceMin') || '')
    setPriceMax(searchParams.get('priceMax') || '')
    setPriceLogic(searchParams.get('priceLogic') || 'and')
    setBidMin(searchParams.get('bidMin') || '')
    setBidMax(searchParams.get('bidMax') || '')
    setBidLogic(searchParams.get('bidLogic') || 'and')
    setAllowUnrated(searchParams.get('allowUnrated') || '')
    setAllowUnratedLogic(searchParams.get('allowUnratedLogic') || 'and')
    setStartAtFrom(normalizeDateInput(searchParams.get('startAtFrom')))
    setStartAtTo(normalizeDateInput(searchParams.get('startAtTo')))
    setStartAtLogic(searchParams.get('startAtLogic') || 'and')
    setEndAtFrom(normalizeDateInput(searchParams.get('endAtFrom')))
    setEndAtTo(normalizeDateInput(searchParams.get('endAtTo')))
    setEndAtLogic(searchParams.get('endAtLogic') || 'and')
  }, [term, searchKey])

  useEffect(() => {
    fetchCategories()
      .then((response) => {
        setCategoryTree(response?.data?.categories || [])
      })
      .catch(() => setCategoryTree([]))
  }, [])

  const selectedCategoryLabel = useMemo(() => {
    if (!categoryId) return 'All categories'
    const targetId = Number(categoryId)
    for (const category of categoryTree) {
      if (Number(category.id) === targetId) return category.name
      const match = category.children?.find((child) => Number(child.id) === targetId)
      if (match) return `${category.name} / ${match.name}`
    }
    return 'Selected category'
  }, [categoryId, categoryTree])

  useEffect(() => {
    if (!term) {
      setItems([])
      setMeta({ ...DEFAULT_META, page: 1 })
      setLoading(false)
      return
    }
    const filters = {
      priceMin: searchParams.get('priceMin') || undefined,
      priceMax: searchParams.get('priceMax') || undefined,
      priceLogic: searchParams.get('priceLogic') || undefined,
      bidMin: searchParams.get('bidMin') || undefined,
      bidMax: searchParams.get('bidMax') || undefined,
      bidLogic: searchParams.get('bidLogic') || undefined,
      allowUnrated: searchParams.get('allowUnrated') || undefined,
      allowUnratedLogic: searchParams.get('allowUnratedLogic') || undefined,
      startAtFrom: searchParams.get('startAtFrom') || undefined,
      startAtTo: searchParams.get('startAtTo') || undefined,
      startAtLogic: searchParams.get('startAtLogic') || undefined,
      endAtFrom: searchParams.get('endAtFrom') || undefined,
      endAtTo: searchParams.get('endAtTo') || undefined,
      endAtLogic: searchParams.get('endAtLogic') || undefined
    }
    setLoading(true)
    setError(null)
    searchProducts(term, { page, sort, categoryId: categoryId || undefined, filters })
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
  }, [term, page, sort, categoryId, searchKey])

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
    setSearchParams(buildSearchParams({ nextTerm: trimmed, nextPage: 1 }))
  }

  const handlePageChange = (nextPage) => {
    if (!term) return
    setSearchParams(buildSearchParams({ nextTerm: term, nextPage }))
  }

  const handleSortChange = (event) => {
    const nextSort = event.target.value
    setSearchParams(buildSearchParams({ nextTerm: term, nextPage: 1, nextSort }))
  }

  const handleCategoryChange = (nextCat) => {
    setSearchParams(buildSearchParams({ nextTerm: term, nextPage: 1, nextCategoryId: nextCat }))
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

  const buildFilterParams = () => {
    const params = {}
    if (priceMin) params.priceMin = priceMin
    if (priceMax) params.priceMax = priceMax
    if ((priceMin || priceMax) && priceLogic) params.priceLogic = priceLogic
    if (bidMin) params.bidMin = bidMin
    if (bidMax) params.bidMax = bidMax
    if ((bidMin || bidMax) && bidLogic) params.bidLogic = bidLogic
    if (allowUnrated) params.allowUnrated = allowUnrated
    if (allowUnrated && allowUnratedLogic) params.allowUnratedLogic = allowUnratedLogic
    if (startAtFrom) params.startAtFrom = toISOFromLocalInput(startAtFrom)
    if (startAtTo) params.startAtTo = toISOFromLocalInput(startAtTo)
    if ((startAtFrom || startAtTo) && startAtLogic) params.startAtLogic = startAtLogic
    if (endAtFrom) params.endAtFrom = toISOFromLocalInput(endAtFrom)
    if (endAtTo) params.endAtTo = toISOFromLocalInput(endAtTo)
    if ((endAtFrom || endAtTo) && endAtLogic) params.endAtLogic = endAtLogic
    return params
  }

  const buildSearchParams = ({ nextTerm, nextPage, nextSort, nextCategoryId } = {}) => {
    const params = {
      q: nextTerm ?? term,
      page: String(nextPage ?? 1)
    }
    const filters = buildFilterParams()
    Object.assign(params, filters)
    const resolvedSort = nextSort ?? sort
    if (resolvedSort) params.sort = resolvedSort
    const resolvedCategory = nextCategoryId ?? categoryId
    if (resolvedCategory) params.categoryId = resolvedCategory
    return params
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

  const hasActiveFilters = Boolean(
    categoryId ||
      priceMin ||
      priceMax ||
      bidMin ||
      bidMax ||
      allowUnrated ||
      startAtFrom ||
      startAtTo ||
      endAtFrom ||
      endAtTo
  )

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
          <div className="dropdown w-100">
            <button
              className="form-select text-start search-category-toggle"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              {selectedCategoryLabel}
            </button>
            <ul className="dropdown-menu w-100 dropdown-menu-categories">
              <li>
                <button
                  type="button"
                  className={`dropdown-item ${!categoryId ? 'active' : ''}`}
                  onClick={() => handleCategoryChange('')}
                >
                  All categories
                </button>
              </li>
              {categoryTree.map((category) => (
                <li key={category.id}>
                  <button
                    type="button"
                    className={`dropdown-item fw-semibold ${String(category.id) === String(categoryId) ? 'active' : ''}`}
                    onClick={() => handleCategoryChange(String(category.id))}
                  >
                    {category.name}
                  </button>
                  {category.children?.length ? (
                    <ul className="list-unstyled ps-3 mb-0">
                      {category.children.map((child) => (
                        <li key={child.id}>
                          <button
                            type="button"
                            className={`dropdown-item ${String(child.id) === String(categoryId) ? 'active' : ''}`}
                            onClick={() => handleCategoryChange(String(child.id))}
                          >
                            {child.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
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
        <div className="col-12">
          <div className="border rounded-3 bg-white">
            <button
              type="button"
              className="btn btn-link w-100 text-start d-flex align-items-center justify-content-between px-3 py-3 text-decoration-none"
              onClick={() => setShowAdvanced((prev) => !prev)}
            >
              <span className="fw-semibold text-secondary">Advanced filters</span>
              <span className="text-muted small">{showAdvanced ? 'Hide' : 'Show'}</span>
            </button>
            {showAdvanced && (
              <div className="px-3 pb-3">
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                  <span className="text-muted small">Choose AND/OR per group</span>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setSearchParams({ q: term, page: '1', sort })}
                    disabled={!hasActiveFilters}
                  >
                    Clear filters
                  </button>
                </div>
                <div className="row g-3">
              <div className="col-12 col-lg-4">
                <label className="form-label">Price range (VND)</label>
                <div className="row g-2">
                  <div className="col-6">
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Min"
                      value={priceMin}
                      onChange={(event) => setPriceMin(event.target.value)}
                    />
                  </div>
                  <div className="col-6">
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Max"
                      value={priceMax}
                      onChange={(event) => setPriceMax(event.target.value)}
                    />
                  </div>
                </div>
                <select
                  className="form-select form-select-sm mt-2"
                  value={priceLogic}
                  onChange={(event) => setPriceLogic(event.target.value)}
                  disabled={!priceMin && !priceMax}
                >
                  {LOGIC_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-lg-4">
                <label className="form-label">Bid count</label>
                <div className="row g-2">
                  <div className="col-6">
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Min"
                      value={bidMin}
                      onChange={(event) => setBidMin(event.target.value)}
                    />
                  </div>
                  <div className="col-6">
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Max"
                      value={bidMax}
                      onChange={(event) => setBidMax(event.target.value)}
                    />
                  </div>
                </div>
                <select
                  className="form-select form-select-sm mt-2"
                  value={bidLogic}
                  onChange={(event) => setBidLogic(event.target.value)}
                  disabled={!bidMin && !bidMax}
                >
                  {LOGIC_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-lg-4">
                <label className="form-label">Allow unrated bidders</label>
                <select
                  className="form-select"
                  value={allowUnrated}
                  onChange={(event) => setAllowUnrated(event.target.value)}
                >
                  <option value="">Any</option>
                  <option value="true">Allow</option>
                  <option value="false">Disallow</option>
                </select>
                <select
                  className="form-select form-select-sm mt-2"
                  value={allowUnratedLogic}
                  onChange={(event) => setAllowUnratedLogic(event.target.value)}
                  disabled={!allowUnrated}
                >
                  {LOGIC_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-lg-6">
                <label className="form-label">Start time range</label>
                <div className="row g-2">
                  <div className="col-6">
                    <input
                      type="datetime-local"
                      className="form-control"
                      value={startAtFrom}
                      onChange={(event) => setStartAtFrom(event.target.value)}
                    />
                  </div>
                  <div className="col-6">
                    <input
                      type="datetime-local"
                      className="form-control"
                      value={startAtTo}
                      onChange={(event) => setStartAtTo(event.target.value)}
                    />
                  </div>
                </div>
                <select
                  className="form-select form-select-sm mt-2"
                  value={startAtLogic}
                  onChange={(event) => setStartAtLogic(event.target.value)}
                  disabled={!startAtFrom && !startAtTo}
                >
                  {LOGIC_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-lg-6">
                <label className="form-label">End time range</label>
                <div className="row g-2">
                  <div className="col-6">
                    <input
                      type="datetime-local"
                      className="form-control"
                      value={endAtFrom}
                      onChange={(event) => setEndAtFrom(event.target.value)}
                    />
                  </div>
                  <div className="col-6">
                    <input
                      type="datetime-local"
                      className="form-control"
                      value={endAtTo}
                      onChange={(event) => setEndAtTo(event.target.value)}
                    />
                  </div>
                </div>
                <select
                  className="form-select form-select-sm mt-2"
                  value={endAtLogic}
                  onChange={(event) => setEndAtLogic(event.target.value)}
                  disabled={!endAtFrom && !endAtTo}
                >
                  {LOGIC_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
              </div>
            )}
          </div>
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
              <ProductCard product={product} compact showBidder={false} />
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

      {categories.length > 0 && !hasActiveFilters && (
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
