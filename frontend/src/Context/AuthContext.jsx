import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../apiClient'

const AuthContext = createContext(null)

// eslint-disable-next-line react-refresh/only-export-components
export function loginPathFor(role) {
  return role === 'landlord' ? '/login?as=landlord' : '/login?as=user'
}

const EMPTY_AUTH = { role: null, token: null, phone: '' }

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(EMPTY_AUTH)
  const [isSessionReady, setIsSessionReady] = useState(false)
  const sessionVersion = useRef(0)

  useEffect(() => {
    const requestVersion = sessionVersion.current

    const restoreSession = async () => {
      try {
        const response = await api.get('/session')
        const session = response.data?.data?.session

        if (sessionVersion.current === requestVersion && ['user', 'landlord'].includes(session?.role)) {
          setAuth({ role: session.role, token: null, phone: session.phone || '' })
        }
      } catch {
        // A failed restore must never block a visitor from signing in. The login request shows
        // its own actionable error if the connection is still unavailable.
      } finally {
        if (sessionVersion.current === requestVersion) {
          setIsSessionReady(true)
        }
      }
    }

    restoreSession()
  }, [])

  const setSession = ({ role, token = null, phone = '' }) => {
    sessionVersion.current += 1
    setAuth({ role, token, phone })
    setIsSessionReady(true)
  }

  const clearSession = () => {
    sessionVersion.current += 1
    setAuth(EMPTY_AUTH)
    setIsSessionReady(true)
  }

  const value = useMemo(
    () => ({ ...auth, isSessionReady, setSession, clearSession }),
    [auth, isSessionReady],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}
