import { useState } from 'react'
import { useAuth } from '../auth/AuthContext.jsx'
import Icon from '../components/Icons.jsx'
import '../styles/login.css'

export default function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!email || !password) {
      setError('Please enter your username and password')
      return
    }
    setLoading(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="login">
      {/* ── Brand panel ── */}
      <aside className="login-brand">
        <div className="login-brand-top">
          <span className="wordmark wordmark--light">DAIKIN</span>
          <span className="login-brand-tag">Supplier Portal</span>
        </div>

        <div className="login-brand-copy">
          <h1>
            One place for every
            <br />
            shipment, schedule
            <br />& purchase order.
          </h1>
          <p>Collaborate with Daikin plants in real time — from PO acknowledgement to delivery.</p>
        </div>

        <ul className="login-features">
          <li>
            <span><Icon name="truck" size={18} /></span>Advance Shipment Notes
          </li>
          <li>
            <span><Icon name="calendar" size={18} /></span>Schedule Releases
          </li>
          <li>
            <span><Icon name="document" size={18} /></span>Purchase Orders
          </li>
        </ul>

        <div className="login-brand-rings" aria-hidden="true" />
      </aside>

      {/* ── Form panel ── */}
      <main className="login-main">
        <form className="login-card" onSubmit={handleSubmit} noValidate>
          <span className="wordmark login-card-mark">DAIKIN</span>
          <h2>Welcome back</h2>
          <p className="login-sub">Sign in to continue to the Supplier Portal</p>

          {error && (
            <div className="login-error" role="alert">
              <Icon name="alert" size={16} />
              {error}
            </div>
          )}

          <label className="field">
            <span className="field-label">Username or email</span>
            <span className="field-control">
              <Icon name="user" size={18} />
              <input
                type="text"
                autoComplete="username"
                placeholder="e.g. arbeel"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
            </span>
          </label>

          <label className="field">
            <span className="field-label">Password</span>
            <span className="field-control">
              <Icon name="lock" size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="field-toggle"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <Icon name={showPassword ? 'eyeOff' : 'eye'} size={18} />
              </button>
            </span>
          </label>

          <div className="login-row">
            <label className="check">
              <input type="checkbox" defaultChecked /> Remember me
            </label>
            <a href="#" onClick={(e) => e.preventDefault()}>
              Forgot password?
            </a>
          </div>

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : <>Sign in <Icon name="arrowRight" size={18} /></>}
          </button>

          <div className="login-demo">
            <Icon name="shield" size={16} />
            <div>
              <strong>Demo credentials</strong>
              <code>arbeel / arbeel123</code>
            </div>
          </div>
        </form>

        <p className="login-foot">© {new Date().getFullYear()} Daikin · Supplier Portal</p>
      </main>
    </div>
  )
}
