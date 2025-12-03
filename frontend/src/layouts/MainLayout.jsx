import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { fetchCategories } from '../services/categories'

export default function MainLayout() {
  const navigate = useNavigate()
  const { isAuthenticated, user, logout } = useAuth()
  const [categories, setCategories] = useState([])
  const [categoryError, setCategoryError] = useState(null)
  const [searchValue, setSearchValue] = useState('')

  useEffect(() => {
    let isMounted = true
    fetchCategories()
      .then((response) => {
        if (isMounted) {
          setCategories(response?.data?.categories ?? [])
          setCategoryError(null)
        }
      })
      .catch((error) => {
        if (isMounted) setCategoryError(error.message || 'Unable to load categories')
      })
    return () => {
      isMounted = false
    }
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleSearch = (event) => {
    event.preventDefault()
    const term = searchValue.trim()
    if (!term) return
    navigate(`/search?q=${encodeURIComponent(term)}`)
  }

  const renderCategoryDropdown = useMemo(() => {
    if (categoryError) {
      return (
        <span className="navbar-text text-warning" title={categoryError}>
          Categories unavailable
        </span>
      )
    }

    if (!categories.length) {
      return null
    }

    return (
      <li className="nav-item dropdown">
        <button
          className="nav-link dropdown-toggle btn btn-link text-decoration-none"
          id="categoryDropdown"
          data-bs-toggle="dropdown"
          aria-expanded="false"
        >
          Categories
        </button>

        <ul
          className="dropdown-menu dropdown-menu-categories"
          aria-labelledby="categoryDropdown"
        >
          {categories.map((category) => (
            <li key={category.id}>
              <div className="dropdown-item">
                <Link
                  to={`/products?categoryId=${category.id}`}
                  className="text-decoration-none d-block fw-semibold mb-1"
                >
                  {category.name}
                </Link>

                {category.children?.length ? (
                  <ul className="list-unstyled ps-3 mb-0">
                    {category.children.map((child) => (
                      <li key={child.id}>
                        <Link
                          className="text-decoration-none"
                          to={`/products?categoryId=${child.id}`}
                        >
                          {child.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </li>
    );
  }, [categories, categoryError]);

  const footerCategories = useMemo(() => categories.slice(0, 4), [categories])

  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-light bg-surface sticky-top">
        <div className="container">
          <Link className="navbar-brand d-flex align-items-center" to="/">
            <span
              className="d-flex align-items-center justify-content-center rounded me-2"
              style={{ width: '32px', height: '32px', backgroundColor: '#dc3545' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#fff" viewBox="0 0 16 16">
                <path d="M9.972 2.508a.5.5 0 0 0-.16-.556l-.178-.129a5.009 5.009 0 0 0-2.076-.783C6.215.862 4.504 1.229 2.84 3.133H1.786a.5.5 0 0 0-.354.147L.146 4.567a.5.5 0 0 0 0 .706l2.571 2.579a.5.5 0 0 0 .708 0l1.286-1.29a.5.5 0 0 0 .146-.353V5.57l8.387 8.873a.5.5 0 0 0 .706 0l1.568-1.574a.5.5 0 0 0 0-.706l-8.873-8.39c.681-.66 1.65-1.248 2.661-1.265z" />
              </svg>
            </span>
            <span className="fw-bold text-dark">BidMaster</span>
          </Link>

          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#mainNavbar"
            aria-controls="mainNavbar"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon" />
          </button>

          <div className="collapse navbar-collapse gap-0.5" id="mainNavbar">
            <ul className="navbar-nav me-auto mb-2 mb-lg-0 d-flex align-items-center gap-0.5">
              <li className="nav-item">
                <NavLink className="nav-link" to="/">
                  Home
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink className="nav-link" to="/products">
                  Auctions
                </NavLink>
              </li>
              {isAuthenticated && (
                <li className="nav-item">
                  <NavLink className="nav-link" to="/profile">
                    Profile
                  </NavLink>
                </li>
              )}
              {isAuthenticated && (
                <li className="nav-item">
                  <NavLink className="nav-link" to="/orders">
                    Orders
                  </NavLink>
                </li>
              )}
              {isAuthenticated && (user?.role === 'SELLER' || user?.role === 'ADMIN') && (
                <li className="nav-item">
                  <NavLink className="nav-link" to="/sell/create">
                    Sell Item
                  </NavLink>
                </li>
              )}
              {isAuthenticated && user?.role === 'ADMIN' && (
                <li className="nav-item">
                  <NavLink className="nav-link" to="/admin">
                    Admin
                  </NavLink>
                </li>
              )}
              {renderCategoryDropdown}
            </ul>

            <ul className="navbar-nav ms-auto align-items-lg-center gap-0.5">
              <li className="nav-item me-lg-3 mb-2 mb-lg-0">
                <form className="d-flex gap-2" onSubmit={handleSearch}>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-search text-muted" viewBox="0 0 16 16">
                        <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
                      </svg>
                    </span>
                    <input
                      type="search"
                      className="form-control border-start-0 bg-light"
                      placeholder="Search items..."
                      value={searchValue}
                      onChange={(event) => setSearchValue(event.target.value)}
                    />
                  </div>
                </form>
              </li>
              {isAuthenticated ? (
                <>
                  <li className="nav-item">
                    <span className="navbar-text me-3 fw-medium text-dark">{user?.fullName ?? user?.email}</span>
                  </li>
                  <li className="nav-item">
                    <button className="btn btn-outline-danger btn-sm" onClick={handleLogout}>
                      Logout
                    </button>
                  </li>
                </>
              ) : (
                <>
                  <li className="nav-item">
                    <NavLink className="nav-link" to="/login">
                      Login
                    </NavLink>
                  </li>
                  <li className="nav-item">
                    <NavLink className="btn btn-primary btn-sm ms-lg-2" to="/register">
                      Register
                    </NavLink>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>
      </nav>

      <main className="flex-grow-1">
        <div className="container py-4">
          <Outlet />
        </div>
      </main>

      <footer className="footer-section py-5 mt-auto">
        <div className="container">
          <div className="row g-4">
            <div className="col-lg-4">
              <div className="d-flex align-items-center gap-2 mb-3">
                <img src="/bidmaster.svg" alt="BidMaster" width="32" height="32" className="me-2" />
                <h5 className="mb-0 text-white fw-bold">BidMaster</h5>
              </div>
              <p className="small mb-4">The premier online auction platform for collectors and enthusiasts worldwide.</p>
              <div className="d-flex gap-2">
                {/* Social placeholders */}
                <div className="bg-secondary bg-opacity-25 p-2 rounded text-white"><i className="bi bi-facebook"></i> F</div>
                <div className="bg-secondary bg-opacity-25 p-2 rounded text-white"><i className="bi bi-twitter"></i> T</div>
                <div className="bg-secondary bg-opacity-25 p-2 rounded text-white"><i className="bi bi-instagram"></i> I</div>
              </div>
            </div>
            <div className="col-6 col-lg-2">
              <h5 className="fw-bold mb-3">Categories</h5>
              <ul className="list-unstyled d-flex flex-column gap-2">
                {footerCategories.length === 0 && <li className="text-muted small">No categories</li>}
                {footerCategories.map((cat) => (
                  <li key={cat.id}>
                    <Link to={`/products?categoryId=${cat.id}`} className="text-decoration-none">
                      {cat.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="col-6 col-lg-2">
              <h5 className="fw-bold mb-3">Support</h5>
              <ul className="list-unstyled d-flex flex-column gap-2">
                <li><a href="#" className="text-decoration-none">Contact Us</a></li>
                <li><a href="#" className="text-decoration-none">Help Center</a></li>
                <li><a href="#" className="text-decoration-none">Terms</a></li>
                <li><a href="#" className="text-decoration-none">Privacy</a></li>
              </ul>
            </div>
            <div className="col-lg-4">
              <h5 className="fw-bold mb-3">Newsletter</h5>
              <p className="small">Subscribe to get the latest auction news.</p>
              <div className="input-group mb-3">
                <input type="email" className="form-control border-0" placeholder="Enter your email" />
                <button className="btn btn-primary" type="button">Subscribe</button>
              </div>
            </div>
          </div>
          <div className="border-top border-secondary border-opacity-25 pt-4 mt-4 text-center">
            <small>© {new Date().getFullYear()} BidMaster. All rights reserved.</small>
          </div>
        </div>
      </footer>
    </>
  )
}
