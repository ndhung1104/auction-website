// frontend/src/routes/index.jsx
import { createBrowserRouter } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'
import HomePage from '../pages/HomePage'
import LoginPage from '../pages/LoginPage'
import RegisterPage from '../pages/RegisterPage'
import ForgotPasswordPage from '../pages/ForgotPasswordPage'
import ProductListPage from '../pages/ProductListPage'
import ProductDetailPage from '../pages/ProductDetailPage'

const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />, // layout dùng chung navbar/footer
    children: [
      {
        index: true, // == path: '/'
        element: <HomePage />,
      },
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'register',
        element: <RegisterPage />,
      },
      {
        path: 'forgot-password',
        element: <ForgotPasswordPage />,
      },
      {
        path: 'products',
        element: <ProductListPage />,
      },
      {
        path: 'products/:productId',
        element: <ProductDetailPage />,
      },
    ],
  },
])

export default router
