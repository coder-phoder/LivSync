import axios from 'axios'
import { createContext, useContext, useMemo, useState } from 'react'

const AuthContext = createContext(null)
const SESSION_KEY = 'livsync-session'

// The session is an opaque token the API hands out at login. Setting it as an axios default puts
// it on every request the app makes, and an Authorization header behaves identically in every
// browser and on every device: no cookie policy, no private-tab or in-app-webview surprises.
function applyToken(token) {
  if (!token) {
    delete axios.defaults.headers.common.Authorization
    return
  }

  axios.defaults.headers.common.Authorization = `Bearer ${token}`
}

// Without a token there is no session to restore, whatever else is in storage.
function getStoredSession() {
  try {
    const storedSession = JSON.parse(localStorage.getItem(SESSION_KEY))

    if (!['user', 'landlord'].includes(storedSession?.role) || typeof storedSession?.token !== 'string') {
      return { role: null, token: null, phone: '' }
    }

    return {
      role: storedSession.role,
      token: storedSession.token,
      phone: storedSession.phone || '',
    }
  } catch {
    return { role: null, token: null, phone: '' }
  }
}

// Safari in private browsing throws on every write, and a throw would land in the caller's catch
// and abort a login that already succeeded. The token is already live on the axios default, so a
// failed write only costs the session its survival across a reload.
function remember(write) {
  try {
    write()
  } catch {
    // storage unavailable
  }
}

// Read at import time so requests fired during the first render are already authenticated.
const initialSession = getStoredSession()

applyToken(initialSession.token)

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(initialSession)

  const setSession = ({ role, token = null, phone = '' }) => {
    setAuth({ role, token, phone })
    applyToken(token)
    remember(() => localStorage.setItem(SESSION_KEY, JSON.stringify({ role, token, phone })))
  }

  const clearSession = () => {
    setAuth({ role: null, token: null, phone: '' })
    applyToken(null)
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
