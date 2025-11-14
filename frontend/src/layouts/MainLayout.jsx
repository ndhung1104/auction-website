import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { fetchCategories } from '../services/categories'

export default function MainLayout() {
  const navigate = useNavigate()
  const { isAuthenticated, user, logout } = useAuth()
  const [categories, setCategories] = useState([])
  const [categoryError, setCategoryError] = useState(null)

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
        <ul className="dropdown-menu" aria-labelledby="categoryDropdown">
          {categories.map((category) => (
            <li key={category.id}>
              <div className="dropdown-item">
                <strong>{category.name}</strong>
                {category.children?.length ? (
                  <ul className="list-unstyled ps-3 mb-0">
                    {category.children.map((child) => (
                      <li key={child.id}>
                        <Link className="text-decoration-none" to={`/products?categoryId=${child.id}`}>
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
    )
  }, [categories, categoryError])

  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
        <div className="container">
          <Link className="navbar-brand" to="/">
            AuctionApp
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

          <div className="collapse navbar-collapse" id="mainNavbar">
            <ul className="navbar-nav me-auto mb-2 mb-lg-0">
              <li className="nav-item">
                <NavLink className="nav-link" to="/">
                  Home
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink className="nav-link" to="/products">
                  Products
                </NavLink>
              </li>
              {isAuthenticated && (
                <li className="nav-item">
                  <NavLink className="nav-link" to="/profile">
                    Profile
                  </NavLink>
                </li>
              )}
              {isAuthenticated && (user?.role === 'SELLER' || user?.role === 'ADMIN') && (
                <li className="nav-item">
                  <NavLink className="nav-link" to="/sell/create">
                    Create product
                  </NavLink>
                </li>
              )}
              {renderCategoryDropdown}
            </ul>

            <ul className="navbar-nav ms-auto">
              {isAuthenticated ? (
                <>
                  <li className="nav-item">
                    <span className="navbar-text me-2">{user?.fullName ?? user?.email}</span>
                  </li>
                  <li className="nav-item">
                    <button className="btn btn-outline-light btn-sm" onClick={handleLogout}>
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

      <main className="container py-4">
        <Outlet />
      </main>

      <footer className="bg-light py-3 mt-auto border-top">
        <div className="container text-center text-muted">
          <small>© {new Date().getFullYear()} AuctionApp — All rights reserved.</small>
        </div>
      </footer>
    </>
  )
}
