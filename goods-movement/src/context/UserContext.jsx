import { createContext, useContext, useState, useEffect } from 'react'

const STORAGE_KEY = 'daikin.session'
const UserContext = createContext(null)

function readSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function UserProvider({ children }) {
  const [user, setUser] = useState(readSession)

  useEffect(() => {
    const handleStorage = () => setUser(readSession())
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const loginId = user?.supplierCode || user?.username || ''
  const loginType = user?.role === 'Supplier' ? 'S' : (user?.loginType || 'V')
  const role = user?.role || 'Supplier'

  return (
    <UserContext.Provider value={{ user, loginId, loginType, role, loading: false }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) {
    const session = readSession()
    return {
      user: session,
      loginId: session?.supplierCode || session?.username || '',
      loginType: session?.role === 'Supplier' ? 'S' : (session?.loginType || 'V'),
      role: session?.role || 'Supplier',
      loading: false,
    }
  }
  return ctx
}
