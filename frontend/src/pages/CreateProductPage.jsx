import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { fetchCategories } from '../services/categories'
import { createProduct } from '../services/products'

const formatDateInput = (date) => {
  const offset = date.getTimezoneOffset()
  const adjusted = new Date(date.getTime() - offset * 60 * 1000)
  return adjusted.toISOString().slice(0, 16)
}

const flattenCategories = (nodes = []) => {
  const items = []

  nodes.forEach((node) => {
    items.push({ id: node.id, name: node.name })
    if (node.children?.length) {
      node.children.forEach((child) => {
        items.push({ id: child.id, name: `— ${child.name}` })
      })
    }
  })

  return items
}

export default function CreateProductPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [categories, setCategories] = useState([])
  const [images, setImages] = useState([])
  const [alert, setAlert] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const defaultStart = formatDateInput(new Date())
  const defaultEnd = formatDateInput(new Date(Date.now() + 48 * 60 * 60 * 1000))

  const [form, setForm] = useState({
    name: '',
    description: '',
    categoryId: '',
    startPrice: '',
    priceStep: '',
    buyNowPrice: '',
    autoExtend: true,
    enableAutoBid: true,
    startAt: defaultStart,
    endAt: defaultEnd
  })

  useEffect(() => {
    let isMounted = true
    fetchCategories()
      .then((response) => {
        if (!isMounted) return
        setCategories(response?.data?.categories || [])
      })
      .catch(() => {
        if (!isMounted) return
        setCategories([])
      })
    return () => {
      isMounted = false
    }
  }, [])

  const flatCategories = useMemo(() => flattenCategories(categories), [categories])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleCheckbox = (event) => {
    const { name, checked } = event.target
    setForm((prev) => ({ ...prev, [name]: checked }))
  }

  const handleImageChange = (event) => {
    setImages(Array.from(event.target.files || []))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (images.length < 3) {
      setAlert({
        type: 'danger',
        message: 'Please select at least three images.'
      })
      return
    }

    setSubmitting(true)
    setAlert(null)
    try {
      const formData = new FormData()
      Object.entries(form).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          formData.append(key, value)
        }
      })
      images.forEach((file) => {
        formData.append('images', file)
      })

      await createProduct(formData)
      setAlert({
        type: 'success',
        message: 'Product created successfully. Redirecting to listings…'
      })
      setTimeout(() => navigate('/products'), 1200)
    } catch (error) {
      setAlert({
        type: 'danger',
        message: error.message || 'Unable to create product'
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (!user || (user.role !== 'SELLER' && user.role !== 'ADMIN')) {
    return (
      <div className="alert alert-warning">
        You need a seller account to create products. Please request an upgrade from your profile.
      </div>
    )
  }

  return (
    <div className="row justify-content-center">
      <div className="col-lg-8">
        <div className="card shadow-sm">
          <div className="card-body">
            <h1 className="h3 mb-4">Create product</h1>
            {alert && (
              <div className={`alert alert-${alert.type}`} role="alert">
                {alert.message}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="name" className="form-label">
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  className="form-control"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="mb-3">
                <label htmlFor="description" className="form-label">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  className="form-control"
                  rows="4"
                  value={form.description}
                  onChange={handleChange}
                />
              </div>
              <div className="row g-3">
                <div className="col-md-6">
                  <label htmlFor="categoryId" className="form-label">
                    Category
                  </label>
                  <select
                    id="categoryId"
                    name="categoryId"
                    className="form-select"
                    value={form.categoryId}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select category</option>
                    {flatCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6">
                  <label htmlFor="buyNowPrice" className="form-label">
                    Buy now price (optional)
                  </label>
                  <input
                    id="buyNowPrice"
                    name="buyNowPrice"
                    type="number"
                    className="form-control"
                    min={form.startPrice || 0}
                    value={form.buyNowPrice}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="row g-3 mt-1">
                <div className="col-md-4">
                  <label htmlFor="startPrice" className="form-label">
                    Start price (VND)
                  </label>
                  <input
                    id="startPrice"
                    name="startPrice"
                    type="number"
                    min="0"
                    className="form-control"
                    value={form.startPrice}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="col-md-4">
                  <label htmlFor="priceStep" className="form-label">
                    Price step (VND)
                  </label>
                  <input
                    id="priceStep"
                    name="priceStep"
                    type="number"
                    min="1"
                    className="form-control"
                    value={form.priceStep}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="col-md-4">
                  <label htmlFor="startAt" className="form-label">
                    Start time
                  </label>
                  <input
                    id="startAt"
                    name="startAt"
                    type="datetime-local"
                    className="form-control"
                    value={form.startAt}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="row g-3 mt-1">
                <div className="col-md-6">
                  <label htmlFor="endAt" className="form-label">
                    End time
                  </label>
                  <input
                    id="endAt"
                    name="endAt"
                    type="datetime-local"
                    className="form-control"
                    value={form.endAt}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="col-md-6 d-flex align-items-center">
                  <div className="form-check me-4">
                    <input
                      id="autoExtend"
                      name="autoExtend"
                      type="checkbox"
                      className="form-check-input"
                      checked={form.autoExtend}
                      onChange={handleCheckbox}
                    />
                    <label className="form-check-label" htmlFor="autoExtend">
                      Auto extend
                    </label>
                  </div>
                  <div className="form-check">
                    <input
                      id="enableAutoBid"
                      name="enableAutoBid"
                      type="checkbox"
                      className="form-check-input"
                      checked={form.enableAutoBid}
                      onChange={handleCheckbox}
                    />
                    <label className="form-check-label" htmlFor="enableAutoBid">
                      Allow auto-bid
                    </label>
                  </div>
                </div>
              </div>
              <div className="mb-4 mt-3">
                <label className="form-label" htmlFor="images">
                  Product images
                </label>
                <input
                  id="images"
                  name="images"
                  type="file"
                  className="form-control"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                />
                <small className="text-muted">At least three images are required.</small>
                {images.length > 0 && (
                  <ul className="mt-2 small">
                    {images.map((file) => (
                      <li key={file.name}>{file.name}</li>
                    ))}
                  </ul>
                )}
              </div>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Publishing…' : 'Publish product'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
