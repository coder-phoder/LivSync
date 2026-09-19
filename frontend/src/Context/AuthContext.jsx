import { createContext, useContext, useMemo, useState } from 'react'

const AuthContext = createContext(null)
const SESSION_KEY = 'livsync-session'

function getStoredSession() {
  try {
    const storedSession = JSON.parse(localStorage.getItem(SESSION_KEY))

    if (!['user', 'landlord'].includes(storedSession?.role)) {
      return { role: null, token: null, phone: '' }
    }

    return {
      role: storedSession.role,
      token: null,
      phone: storedSession.phone || '',
    }
  } catch {
    return { role: null, token: null, phone: '' }
  }
}

// Safari in private browsing throws on every write, and a throw would land in the caller's catch
// and abort a login that already succeeded. The session lives in the cookie regardless; storage
// only survives a reload, so losing it is not worth failing the login over.
function remember(write) {
  try {
    write()
  } catch {
    // storage unavailable
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(getStoredSession)

  const setSession = ({ role, token = null, phone = '' }) => {
    setAuth({ role, token, phone })
    remember(() => localStorage.setItem(SESSION_KEY, JSON.stringify({ role, phone })))
  }

  const clearSession = () => {
    setAuth({ role: null, token: null, phone: '' })
    remember(() => localStorage.removeItem(SESSION_KEY))
  }

  const value = useMemo(
    () => ({ ...auth, setSession, clearSession }),
    [auth],
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
