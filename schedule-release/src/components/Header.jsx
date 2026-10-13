import { APP_NAME, PORTAL_URL } from '../config/app.js'

export default function Header() {
  return (
    <header className="header">
      <div className="container header-inner">
        <a className="logo" href={PORTAL_URL}>DAIKIN</a>
        <span className="header-title">{APP_NAME}</span>
        <a className="back-link" href={PORTAL_URL}>← Back to Portal</a>
      </div>
    </header>
  )
}
