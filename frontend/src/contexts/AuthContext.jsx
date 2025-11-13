import { createContext, useContext, useMemo, useState } from 'react'

const AUTH_TOKEN_KEY = 'authToken'
const AUTH_USER_KEY = 'authUser'
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(AUTH_TOKEN_KEY))
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem(AUTH_USER_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  })

  const login = (nextToken, nextUser = null) => {
    setToken(nextToken)
    setUser(nextUser)
    localStorage.setItem(AUTH_TOKEN_KEY, nextToken)
    if (nextUser) {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(nextUser))
    } else {
      localStorage.removeItem(AUTH_USER_KEY)
    }
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem(AUTH_USER_KEY)
  }

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token),
      login,
      logout,
      setUser
    }),
    [token, user]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export { AUTH_TOKEN_KEY }
