// frontend/src/layouts/MainLayout.jsx
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function MainLayout() {
  const navigate = useNavigate()
  const { isAuthenticated, user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <>
      {/* Navbar */}
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
              {/* thêm các link khác ở đây */}
            </ul>

            <ul className="navbar-nav ms-auto">
              {isAuthenticated ? (
                <>
                  <li className="nav-item">
                    <span className="navbar-text me-2">
                      {user?.name ?? 'Logged in'}
                    </span>
                  </li>
                  <li className="nav-item">
                    <button
                      className="btn btn-outline-light btn-sm"
                      onClick={handleLogout}
                    >
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

      {/* Main content */}
      <main className="container py-4">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-light py-3 mt-auto border-top">
        <div className="container text-center text-muted">
          <small>© {new Date().getFullYear()} AuctionApp — All rights reserved.</small>
        </div>
      </footer>
    </>
  )
}
