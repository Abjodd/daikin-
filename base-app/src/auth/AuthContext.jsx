import { createContext, useContext, useState } from 'react'
import { USERS } from '../config/users.js'

const STORAGE_KEY = 'daikin.session'
const AuthContext = createContext(null)

function readSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readSession)

  // Hardcoded check against src/config/users.js.
  // Later: replace the body with a fetch() to your auth API.
  // `id` can be the username (e.g. "arbeel") or the email address.
  async function login(id, password) {
    await new Promise((r) => setTimeout(r, 600)) // simulate network
    const key = id.trim().toLowerCase()
    const match = USERS.find(
      (u) => (u.username === key || u.email.toLowerCase() === key) && u.password === password,
    )
    if (!match) throw new Error('Invalid username or password')

    const { password: _omit, ...session } = match
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    } catch {
      /* storage unavailable — stay logged in for this tab only */
    }
    setUser(session)
    return session
  }

  function logout() {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
