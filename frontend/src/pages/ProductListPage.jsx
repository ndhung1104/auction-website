import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchProducts } from '../services/products'
import { formatVND } from '../utils/format'

const SORT_OPTIONS = [
  { value: 'end_at,asc', label: 'Ending soon' },
  { value: 'end_at,desc', label: 'Newly listed' },
  { value: 'price,asc', label: 'Price: low to high' },
  { value: 'price,desc', label: 'Price: high to low' },
  { value: 'bid_count,desc', label: 'Most bids' }
]

export default function ProductListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState({ page: 1, totalPages: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const currentPage = Number(searchParams.get('page')) || 1
  const currentSort = searchParams.get('sort') || SORT_OPTIONS[0].value
  const categoryId = searchParams.get('categoryId')

  useEffect(() => {
    let isMounted = true
    setLoading(true)
    fetchProducts({
      page: currentPage,
      sort: currentSort,
      categoryId
    })
      .then((response) => {
        if (!isMounted) return
        setItems(response?.data?.items || [])
        setMeta(response?.meta || { page: 1, totalPages: 0, total: 0 })
        setError(null)
      })
      .catch((err) => {
        if (!isMounted) return
        setError(err.message || 'Unable to load products')
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [currentPage, currentSort, categoryId])

  const handleSortChange = (event) => {
    const nextSort = event.target.value
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev)
      params.set('sort', nextSort)
      params.set('page', '1')
      return params
    })
  }

  const goToPage = (nextPage) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev)
      params.set('page', String(nextPage))
      return params
    })
  }

  const sortLabel = useMemo(() => SORT_OPTIONS.find((option) => option.value === currentSort)?.label, [currentSort])

  return (
    <div>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h1 className="mb-0">Products</h1>
          <small className="text-muted">
            Showing {items.length} of {meta.total} items — sorted by {sortLabel || 'custom'}
          </small>
        </div>
        <div className="d-flex align-items-center gap-2">
          <label htmlFor="sort" className="form-label mb-0">
            Sort by
          </label>
          <select id="sort" className="form-select" value={currentSort} onChange={handleSortChange}>
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && <div className="alert alert-info">Loading products…</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      {!loading && !error && !items.length && (
        <div className="alert alert-warning">No products match this filter.</div>
      )}

      <div className="row g-4">
        {items.map((product) => (
          <div key={product.id} className="col-12 col-sm-6 col-lg-4">
            <div className="card h-100 shadow-sm">
              <div className="card-body d-flex flex-column">
                <h5 className="card-title">{product.name}</h5>
                <p className="card-text text-muted mb-2">
                  Current price: <strong>{formatVND(product.currentPrice)}</strong>
                </p>
                <p className="card-text text-muted mb-2">Bids: {product.bidCount}</p>
                <p className="card-text small text-muted mt-auto">Ends at: {new Date(product.endAt).toLocaleString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {meta.totalPages > 1 && (
        <nav className="mt-4" aria-label="Product pagination">
          <ul className="pagination">
            <li className={`page-item ${meta.page <= 1 ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => goToPage(meta.page - 1)} disabled={meta.page <= 1}>
                Previous
              </button>
            </li>
            <li className="page-item disabled">
              <span className="page-link">
                Page {meta.page} / {meta.totalPages}
              </span>
            </li>
            <li className={`page-item ${meta.page >= meta.totalPages ? 'disabled' : ''}`}>
              <button
                className="page-link"
                onClick={() => goToPage(meta.page + 1)}
                disabled={meta.page >= meta.totalPages}
              >
                Next
              </button>
            </li>
          </ul>
        </nav>
      )}
    </div>
  )
}
