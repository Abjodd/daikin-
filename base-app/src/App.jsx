import { AuthProvider, useAuth } from './auth/AuthContext.jsx'
import LoginPage from './pages/LoginPage.jsx'
import LandingPage from './pages/LandingPage.jsx'

// Shows the login page until the user signs in, then the portal.
function Gate() {
  const { user } = useAuth()
  return user ? <LandingPage /> : <LoginPage />
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}
