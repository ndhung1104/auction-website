import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchProducts } from '../services/products'
import ProductCard from '../components/ProductCard'

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
    <div className="py-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-5 gap-3 bg-surface p-4 rounded-3 shadow-sm border">
        <div>
          <h1 className="h3 fw-bold text-primary mb-1">Products</h1>
          <p className="text-secondary mb-0 small">
            Showing <span className="fw-bold text-dark">{items.length}</span> of {meta.total} items — sorted by {sortLabel || 'custom'}
          </p>
        </div>
        <div className="d-flex align-items-center gap-3">
          <label htmlFor="sort" className="form-label mb-0 text-secondary fw-medium text-nowrap">
            Sort by:
          </label>
          <select
            id="sort"
            className="form-select form-select-sm border-secondary-subtle"
            style={{ minWidth: '180px' }}
            value={currentSort}
            onChange={handleSortChange}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}

      {error && <div className="alert alert-danger shadow-sm">{error}</div>}

      {!loading && !error && !items.length && (
        <div className="alert alert-warning shadow-sm border-0">No products match this filter.</div>
      )}

      <div className="row g-4">
        {items.map((product) => (
          <div key={product.id} className="col-12 col-sm-6 col-lg-4 col-xl-3">
            <ProductCard product={product} />
          </div>
        ))}
      </div>

      {meta.totalPages > 1 && (
        <nav className="mt-5 d-flex justify-content-center" aria-label="Product pagination">
          <ul className="pagination shadow-sm">
            <li className={`page-item ${meta.page <= 1 ? 'disabled' : ''}`}>
              <button className="page-link border-0" onClick={() => goToPage(meta.page - 1)} disabled={meta.page <= 1}>
                Previous
              </button>
            </li>
            <li className="page-item disabled">
              <span className="page-link border-0 fw-bold text-dark px-4">
                Page {meta.page} / {meta.totalPages}
              </span>
            </li>
            <li className={`page-item ${meta.page >= meta.totalPages ? 'disabled' : ''}`}>
              <button
                className="page-link border-0"
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
