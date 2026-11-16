import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import GoodsMovement from './pages/GoodsMovement.jsx'
import CreateMovement from './pages/createMovement.jsx'
import { UserProvider } from './context/UserContext.jsx'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, errorInfo) {
    console.error('Goods Movement caught an error:', error, errorInfo)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', fontFamily: 'sans-serif', color: '#cc1c14' }}>
          <h2>Something went wrong in Goods Movement.</h2>
          <pre style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '8px', color: '#333' }}>
            {this.state.error?.toString()}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: '1rem', padding: '8px 16px', background: '#0a6ed1', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Reload Page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// On BTP the app is served under /goodsmovementui; locally (npm run dev) it's at /
export default function App() {
  return (
    <ErrorBoundary>
      <UserProvider>
        <BrowserRouter basename={import.meta.env.PROD ? '/goodsmovementui' : '/'}>
          <Routes>
            <Route path="/" element={<GoodsMovement />} />
            <Route path="/create-movement" element={<CreateMovement />} />
            <Route path="/create" element={<CreateMovement />} />

            {/* Support matching legacy nested paths */}
            <Route path="/shipment/GoodsMovement" element={<GoodsMovement />} />
            <Route path="/shipment/GoodsMovement/create-movement" element={<CreateMovement />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </UserProvider>
    </ErrorBoundary>
  )
}
